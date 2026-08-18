"use client";

import { useState, useTransition } from "react";
import { teacherReviewStudentLeaveAction } from "@/actions/student-attendance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Paperclip,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  User,
  AlertCircle,
  SunMedium,
  Check,
  X,
} from "lucide-react";

interface LeaveRequestItem {
  id: string;
  startDate: Date | string;
  endDate: Date | string;
  reason: string;
  isHalfDay: boolean;
  halfDaySession?: string | null;
  status: string;
  reviewNote?: string | null;
  createdAt: Date | string;
  medicalCertS3Key?: string | null;
  medicalCertName?: string | null;
  medicalCertUrl?: string;
  student?: {
    id: string;
    name: string;
    classSection?: {
      name: string;
      grade: string;
      section: string;
    } | null;
  } | null;
  requester?: {
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
}

export function StudentLeaveReviewList({
  initialRequests,
}: {
  initialRequests: LeaveRequestItem[];
}) {
  const [requests, setRequests] = useState<LeaveRequestItem[]>(initialRequests);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  // Review Dialog State
  const [activeReview, setActiveReview] = useState<{
    request: LeaveRequestItem;
    action: "APPROVED" | "REJECTED";
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Medical Cert Viewer Modal State
  const [previewCert, setPreviewCert] = useState<{
    studentName: string;
    certName: string;
    certUrl: string;
  } | null>(null);

  async function handleConfirmReview() {
    if (!activeReview) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await teacherReviewStudentLeaveAction({
          leaveRequestId: activeReview.request.id,
          status: activeReview.action,
          reviewNote: reviewNote || undefined,
        });

        // Update local state
        setRequests((prev) =>
          prev.map((r) =>
            r.id === activeReview.request.id
              ? { ...r, status: activeReview.action, reviewNote }
              : r,
          ),
        );

        setSuccessMsg(
          `Leave request for ${activeReview.request.student?.name} was ${activeReview.action.toLowerCase()}.`,
        );
        setActiveReview(null);
        setReviewNote("");
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to update leave request.");
      }
    });
  }

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "ALL") return true;
    return r.status === statusFilter;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      {/* Header & Filter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card
          onClick={() => setStatusFilter("ALL")}
          className={`cursor-pointer transition-all border-border/60 ${
            statusFilter === "ALL" ? "ring-2 ring-primary" : "hover:border-primary/50"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">All Requests</p>
              <p className="text-2xl font-bold mt-0.5">{requests.length}</p>
            </div>
            <FileText className="h-6 w-6 text-muted-foreground/40" />
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter("PENDING")}
          className={`cursor-pointer transition-all border-amber-500/30 bg-amber-500/5 ${
            statusFilter === "PENDING" ? "ring-2 ring-amber-500" : "hover:border-amber-500/50"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pending Review</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{pendingCount}</p>
            </div>
            <Clock className="h-6 w-6 text-amber-500/40" />
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter("APPROVED")}
          className={`cursor-pointer transition-all border-emerald-500/30 bg-emerald-500/5 ${
            statusFilter === "APPROVED" ? "ring-2 ring-emerald-500" : "hover:border-emerald-500/50"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Approved</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{approvedCount}</p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-emerald-500/40" />
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter("REJECTED")}
          className={`cursor-pointer transition-all border-rose-500/30 bg-rose-500/5 ${
            statusFilter === "REJECTED" ? "ring-2 ring-rose-500" : "hover:border-rose-500/50"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Rejected</p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-0.5">{rejectedCount}</p>
            </div>
            <XCircle className="h-6 w-6 text-rose-500/40" />
          </CardContent>
        </Card>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <CardTitle className="text-base font-semibold">Parent Leave Requests</CardTitle>
          <CardDescription>Review and manage student leave requests submitted by parents.</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10">
                <TableHead>Student / Class</TableHead>
                <TableHead>Parent Info</TableHead>
                <TableHead>Leave Duration</TableHead>
                <TableHead>Reason & Documents</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No leave requests found matching status "{statusFilter}".
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req) => {
                  const start = new Date(req.startDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const end = new Date(req.endDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <TableRow key={req.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="font-semibold text-foreground">{req.student?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {req.student?.classSection?.name || "Class Section"}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs font-medium text-foreground">{req.requester?.name || "Parent"}</div>
                        {req.requester?.phone && (
                          <div className="text-xs text-muted-foreground">{req.requester.phone}</div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="text-xs font-medium flex items-center gap-1.5 text-foreground">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {start === end ? start : `${start} — ${end}`}
                        </div>

                        {req.isHalfDay ? (
                          <div className="mt-1">
                            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/40 border-purple-300 gap-1">
                              <SunMedium className="h-3 w-3" />
                              Half Day ({req.halfDaySession === "SECOND_HALF" ? "Afternoon" : "Morning"})
                            </Badge>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground mt-0.5">Full Day Leave</div>
                        )}
                      </TableCell>

                      <TableCell>
                        <p className="text-xs text-foreground/90 max-w-xs">{req.reason}</p>

                        {req.medicalCertUrl && (
                          <div className="mt-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPreviewCert({
                                  studentName: req.student?.name || "Student",
                                  certName: req.medicalCertName || "Medical Certificate",
                                  certUrl: req.medicalCertUrl!,
                                })
                              }
                              className="h-6 text-[11px] px-2 border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 gap-1"
                            >
                              <Paperclip className="h-3 w-3" />
                              Medical Cert ({req.medicalCertName || "Attached"})
                            </Button>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            req.status === "APPROVED"
                              ? "success"
                              : req.status === "REJECTED"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {req.status}
                        </Badge>
                        {req.reviewNote && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1" title={req.reviewNote}>
                            Note: {req.reviewNote}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {req.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setActiveReview({ request: req, action: "APPROVED" });
                                setReviewNote("");
                              }}
                              className="h-7 text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setActiveReview({ request: req, action: "REJECTED" });
                                setReviewNote("");
                              }}
                              className="h-7 text-xs border-rose-500/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Reviewed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={activeReview !== null} onOpenChange={(open) => !open && setActiveReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeReview?.action === "APPROVED" ? "Approve Leave Request" : "Reject Leave Request"}
            </DialogTitle>
            <DialogDescription>
              Confirm decision for student <span className="font-semibold text-foreground">{activeReview?.request.student?.name}</span>.
              {activeReview?.action === "APPROVED" && (
                <span className="block mt-1 text-emerald-600 font-medium">
                  Approving will automatically mark the student's attendance for the requested dates.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Optional Note / Feedback to Parent</Label>
              <Input
                placeholder="e.g. Approved. Please bring homework upon return."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActiveReview(null)}>
              Cancel
            </Button>
            <Button
              variant={activeReview?.action === "APPROVED" ? "default" : "destructive"}
              onClick={handleConfirmReview}
              disabled={isPending}
            >
              {isPending ? "Processing..." : `Confirm ${activeReview?.action}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Medical Certificate Modal */}
      <Dialog open={previewCert !== null} onOpenChange={(open) => !open && setPreviewCert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-blue-600" />
              Medical Certificate - {previewCert?.studentName}
            </DialogTitle>
            <DialogDescription>Document: {previewCert?.certName}</DialogDescription>
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
