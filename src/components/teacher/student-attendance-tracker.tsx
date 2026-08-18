"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getClassRosterAttendanceAction,
  saveBatchStudentAttendanceAction,
} from "@/actions/student-attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  Clock,
  SunMedium,
  Search,
  FileText,
  Paperclip,
  Save,
  CheckCheck,
  AlertCircle,
  Info,
  Calendar,
  UserCheck,
} from "lucide-react";

interface ClassSectionOption {
  id: string;
  name: string;
  studentCount: number;
}

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY";
type SessionType = "FULL_DAY" | "FIRST_HALF" | "SECOND_HALF";

interface RosterStudent {
  id: string;
  name: string;
  admissionNo: string | null;
  attendance: {
    id: string;
    status: AttendanceStatus;
    session?: string;
    notes?: string;
    leaveRequestId?: string;
  } | null;
  leaveRequest: {
    id: string;
    reason: string;
    leaveType: string;
    isHalfDay: boolean;
    halfDaySession?: string;
    status: string;
    medicalCertS3Key?: string;
    medicalCertName?: string;
    medicalCertUrl?: string;
    parentName?: string;
  } | null;
}

export function StudentAttendanceTracker({
  classSections,
}: {
  classSections: ClassSectionOption[];
}) {
  const [selectedClassId, setSelectedClassId] = useState<string>(
    () => classSections[0]?.id ?? "",
  );
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split("T")[0]!;
  });

  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [localState, setLocalState] = useState<
    Record<
      string,
      {
        status: AttendanceStatus;
        session: SessionType;
        notes: string;
        leaveRequestId?: string;
      }
    >
  >({});

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal for Medical Certificate Preview
  const [previewCert, setPreviewCert] = useState<{
    studentName: string;
    certName: string;
    certUrl: string;
  } | null>(null);

  // Load roster whenever class or date changes
  useEffect(() => {
    if (!selectedClassId || !selectedDate) return;
    setSaveSuccess(null);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await getClassRosterAttendanceAction({
          classSectionId: selectedClassId,
          date: selectedDate,
        });

        setRoster(res.students);

        // Initialize local state mapping
        const initialState: Record<
          string,
          {
            status: AttendanceStatus;
            session: SessionType;
            notes: string;
            leaveRequestId?: string;
          }
        > = {};

        for (const s of res.students) {
          if (s.attendance) {
            initialState[s.id] = {
              status: s.attendance.status,
              session: (s.attendance.session as SessionType) ?? (s.attendance.status === "HALF_DAY" ? "FIRST_HALF" : "FULL_DAY"),
              notes: s.attendance.notes ?? "",
              leaveRequestId: s.attendance.leaveRequestId,
            };
          } else if (s.leaveRequest && s.leaveRequest.status === "APPROVED") {
            initialState[s.id] = {
              status: s.leaveRequest.isHalfDay ? "HALF_DAY" : "ABSENT",
              session: s.leaveRequest.isHalfDay ? ((s.leaveRequest.halfDaySession as SessionType) || "FIRST_HALF") : "FULL_DAY",
              notes: `Approved Leave: ${s.leaveRequest.reason}`,
              leaveRequestId: s.leaveRequest.id,
            };
          } else {
            // Default to PRESENT
            initialState[s.id] = {
              status: "PRESENT",
              session: "FULL_DAY",
              notes: "",
            };
          }
        }
        setLocalState(initialState);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load class roster.");
      }
    });
  }, [selectedClassId, selectedDate]);

  function handleStatusChange(studentId: string, newStatus: AttendanceStatus) {
    setLocalState((prev) => {
      const current = prev[studentId] || { status: "PRESENT", session: "FULL_DAY", notes: "" };
      let newSession: SessionType = current.session;
      if (newStatus === "HALF_DAY" && current.session === "FULL_DAY") {
        newSession = "FIRST_HALF";
      } else if (newStatus !== "HALF_DAY") {
        newSession = "FULL_DAY";
      }

      return {
        ...prev,
        [studentId]: {
          ...current,
          status: newStatus,
          session: newSession,
        },
      };
    });
  }

  function handleSessionChange(studentId: string, newSession: SessionType) {
    setLocalState((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: "HALF_DAY", notes: "" }),
        session: newSession,
      },
    }));
  }

  function handleNotesChange(studentId: string, notes: string) {
    setLocalState((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: "PRESENT", session: "FULL_DAY" }),
        notes,
      },
    }));
  }

  function handleMarkAllPresent() {
    setLocalState((prev) => {
      const updated = { ...prev };
      for (const s of roster) {
        updated[s.id] = {
          status: "PRESENT",
          session: "FULL_DAY",
          notes: prev[s.id]?.notes || "",
        };
      }
      return updated;
    });
  }

  async function handleSaveAttendance() {
    if (!selectedClassId || roster.length === 0) return;
    setSaveSuccess(null);
    setErrorMessage(null);

    const payload = roster.map((s) => {
      const state = localState[s.id] || { status: "PRESENT", session: "FULL_DAY", notes: "" };
      return {
        studentId: s.id,
        status: state.status,
        session: state.session,
        notes: state.notes || undefined,
        leaveRequestId: state.leaveRequestId,
      };
    });

    startTransition(async () => {
      try {
        await saveBatchStudentAttendanceAction({
          classSectionId: selectedClassId,
          date: selectedDate,
          records: payload,
        });
        setSaveSuccess(`Successfully saved attendance for ${payload.length} students.`);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to save attendance.");
      }
    });
  }

  // Summary Metrics
  const totalCount = roster.length;
  const presentCount = Object.values(localState).filter((s) => s.status === "PRESENT").length;
  const absentCount = Object.values(localState).filter((s) => s.status === "ABSENT").length;
  const lateCount = Object.values(localState).filter((s) => s.status === "LATE").length;
  const halfDayCount = Object.values(localState).filter((s) => s.status === "HALF_DAY").length;
  const leaveReqCount = roster.filter((s) => s.leaveRequest !== null).length;

  // Filtered Roster
  const filteredRoster = roster.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.admissionNo && s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase()));

    const state = localState[s.id];
    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "LEAVE_REQ") return s.leaveRequest !== null;
    return state?.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <Card className="border-border/60 bg-gradient-to-r from-card via-card to-secondary/10 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 flex-1">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Class & Section
                </Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="mt-1 bg-background">
                    <SelectValue placeholder="Select Class Section" />
                  </SelectTrigger>
                  <SelectContent>
                    {classSections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.studentCount} Students)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Attendance Date
                </Label>
                <div className="mt-1">
                  <DatePicker value={selectedDate} onChange={setSelectedDate} required />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Search Student
                </Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 md:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllPresent}
                disabled={isPending || roster.length === 0}
                className="gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <CheckCheck className="h-4 w-4" />
                Mark All Present
              </Button>

              <Button
                onClick={handleSaveAttendance}
                disabled={isPending || roster.length === 0}
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all"
              >
                <Save className="h-4 w-4" />
                {isPending ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Header */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="border-border/40 bg-card/50 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Roster</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{totalCount}</p>
            </div>
            <UserCheck className="h-7 w-7 text-muted-foreground/40" />
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Present</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{presentCount}</p>
            </div>
            <CheckCircle2 className="h-7 w-7 text-emerald-500/40" />
          </CardContent>
        </Card>

        <Card className="border-rose-500/20 bg-rose-500/5 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Absent</p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-0.5">{absentCount}</p>
            </div>
            <XCircle className="h-7 w-7 text-rose-500/40" />
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Late</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{lateCount}</p>
            </div>
            <Clock className="h-7 w-7 text-amber-500/40" />
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-500/5 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">Half Day</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-0.5">{halfDayCount}</p>
            </div>
            <SunMedium className="h-7 w-7 text-purple-500/40" />
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Parent Leave</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-0.5">{leaveReqCount}</p>
            </div>
            <FileText className="h-7 w-7 text-blue-500/40" />
          </CardContent>
        </Card>
      </div>

      {/* Messages */}
      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Roster Table Card */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Student Attendance Roster</CardTitle>
              <CardDescription>Mark daily attendance, half-day leaves, and view parent leave requests.</CardDescription>
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-background p-1 rounded-lg border text-xs">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  statusFilter === "ALL" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({roster.length})
              </button>
              <button
                onClick={() => setStatusFilter("PRESENT")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  statusFilter === "PRESENT" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-emerald-600"
                }`}
              >
                Present ({presentCount})
              </button>
              <button
                onClick={() => setStatusFilter("ABSENT")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  statusFilter === "ABSENT" ? "bg-rose-600 text-white shadow-xs" : "text-muted-foreground hover:text-rose-600"
                }`}
              >
                Absent ({absentCount})
              </button>
              <button
                onClick={() => setStatusFilter("HALF_DAY")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  statusFilter === "HALF_DAY" ? "bg-purple-600 text-white shadow-xs" : "text-muted-foreground hover:text-purple-600"
                }`}
              >
                Half Day ({halfDayCount})
              </button>
              <button
                onClick={() => setStatusFilter("LATE")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  statusFilter === "LATE" ? "bg-amber-600 text-white shadow-xs" : "text-muted-foreground hover:text-amber-600"
                }`}
              >
                Late ({lateCount})
              </button>
              <button
                onClick={() => setStatusFilter("LEAVE_REQ")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  statusFilter === "LEAVE_REQ" ? "bg-blue-600 text-white shadow-xs" : "text-muted-foreground hover:text-blue-600"
                }`}
              >
                Leave Req ({leaveReqCount})
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10">
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead className="min-w-[180px]">Student Name</TableHead>
                <TableHead className="min-w-[320px]">Attendance Status</TableHead>
                <TableHead className="min-w-[220px]">Parent Leave / Certificate</TableHead>
                <TableHead className="min-w-[200px]">Notes / Reason</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isPending && roster.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Loading student roster...
                  </TableCell>
                </TableRow>
              ) : filteredRoster.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No students match the selected filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoster.map((student, idx) => {
                  const state = localState[student.id] || {
                    status: "PRESENT",
                    session: "FULL_DAY",
                    notes: "",
                  };

                  const leaveReq = student.leaveRequest;

                  return (
                    <TableRow key={student.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {idx + 1}
                      </TableCell>

                      <TableCell>
                        <div className="font-medium text-foreground">{student.name}</div>
                        {student.admissionNo && (
                          <div className="text-xs text-muted-foreground font-mono">
                            ID: {student.admissionNo}
                          </div>
                        )}
                      </TableCell>

                      {/* Status Toggle Controls */}
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Present Button */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, "PRESENT")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all flex items-center gap-1 ${
                              state.status === "PRESENT"
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm scale-102"
                                : "bg-background text-muted-foreground border-border hover:border-emerald-500/50 hover:text-emerald-600"
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Present
                          </button>

                          {/* Absent Button */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, "ABSENT")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all flex items-center gap-1 ${
                              state.status === "ABSENT"
                                ? "bg-rose-600 text-white border-rose-600 shadow-sm scale-102"
                                : "bg-background text-muted-foreground border-border hover:border-rose-500/50 hover:text-rose-600"
                            }`}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Absent
                          </button>

                          {/* Half Day Button */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, "HALF_DAY")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all flex items-center gap-1 ${
                              state.status === "HALF_DAY"
                                ? "bg-purple-600 text-white border-purple-600 shadow-sm scale-102"
                                : "bg-background text-muted-foreground border-border hover:border-purple-500/50 hover:text-purple-600"
                            }`}
                          >
                            <SunMedium className="h-3.5 w-3.5" />
                            Half Day
                          </button>

                          {/* Late Button */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, "LATE")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all flex items-center gap-1 ${
                              state.status === "LATE"
                                ? "bg-amber-600 text-white border-amber-600 shadow-sm scale-102"
                                : "bg-background text-muted-foreground border-border hover:border-amber-500/50 hover:text-amber-600"
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            Late
                          </button>
                        </div>

                        {/* Session selector for Half Day */}
                        {state.status === "HALF_DAY" && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground font-medium">Session:</span>
                            <Select
                              value={state.session}
                              onValueChange={(val: SessionType) => handleSessionChange(student.id, val)}
                            >
                              <SelectTrigger className="h-7 text-xs w-[140px] bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FIRST_HALF">Morning (1st Half)</SelectItem>
                                <SelectItem value="SECOND_HALF">Afternoon (2nd Half)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </TableCell>

                      {/* Parent Leave Info & Medical Certificate */}
                      <TableCell>
                        {leaveReq ? (
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant={leaveReq.status === "APPROVED" ? "success" : "warning"}
                                className="text-[10px] px-1.5 py-0"
                              >
                                Parent Req: {leaveReq.status}
                              </Badge>

                              {leaveReq.isHalfDay && (
                                <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/40 border-purple-300">
                                  Half Day ({leaveReq.halfDaySession === "SECOND_HALF" ? "Afternoon" : "Morning"})
                                </Badge>
                              )}
                            </div>

                            <p className="text-muted-foreground line-clamp-1 italic" title={leaveReq.reason}>
                              "{leaveReq.reason}"
                            </p>

                            {/* Medical Certificate Button */}
                            {leaveReq.medicalCertUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setPreviewCert({
                                    studentName: student.name,
                                    certName: leaveReq.medicalCertName || "Medical Certificate",
                                    certUrl: leaveReq.medicalCertUrl!,
                                  })
                                }
                                className="h-6 text-[11px] px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 gap-1 border border-blue-200 dark:border-blue-800"
                              >
                                <Paperclip className="h-3 w-3" />
                                View Medical Cert
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </TableCell>

                      {/* Notes Input */}
                      <TableCell>
                        <Input
                          placeholder="Optional remarks..."
                          value={state.notes}
                          onChange={(e) => handleNotesChange(student.id, e.target.value)}
                          className="h-8 text-xs bg-background"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Medical Certificate Preview Modal */}
      <Dialog open={previewCert !== null} onOpenChange={(open) => !open && setPreviewCert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-blue-600" />
              Medical Certificate - {previewCert?.studentName}
            </DialogTitle>
            <DialogDescription>
              Uploaded document: {previewCert?.certName}
            </DialogDescription>
          </DialogHeader>

          {previewCert?.certUrl && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/20 p-2 overflow-hidden flex justify-center items-center min-h-[300px] max-h-[500px]">
                {previewCert.certUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) ? (
                  <img
                    src={previewCert.certUrl}
                    alt="Medical Certificate"
                    className="max-h-[460px] object-contain rounded"
                  />
                ) : (
                  <iframe
                    src={previewCert.certUrl}
                    title="Medical Certificate PDF"
                    className="w-full h-[400px] rounded border"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(previewCert.certUrl, "_blank")}
                  className="gap-1.5"
                >
                  Open in New Tab
                </Button>
                <Button onClick={() => setPreviewCert(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
