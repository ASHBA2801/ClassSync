"use client";

import { useState, useTransition } from "react";
import {
  createComplementarySwapAction,
  createParallelSwapAction,
  cancelSwapGroupAction,
} from "@/actions/smart-scheduler";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Teacher {
  id: string;
  name: string;
}

interface SwapGroup {
  id: string;
  type: string;
  teacherAId: string;
  teacherBId: string;
  alterations: Array<{
    id: string;
    date: Date;
    periodNo: number;
    classSection: { name: string };
  }>;
}

export function TeacherSwapForm({
  currentTeacherId,
  teachers,
  swapGroups,
}: {
  currentTeacherId: string;
  teachers: Teacher[];
  swapGroups: SwapGroup[];
}) {
  const [partnerId, setPartnerId] = useState("");
  const [dateA, setDateA] = useState("");
  const [periodA, setPeriodA] = useState("1");
  const [dateB, setDateB] = useState("");
  const [periodB, setPeriodB] = useState("1");
  const [parallelDate, setParallelDate] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const otherTeachers = teachers.filter((t) => t.id !== currentTeacherId);

  function teacherName(id: string) {
    return teachers.find((t) => t.id === id)?.name ?? "Unknown";
  }

  function handleComplementary() {
    setError("");
    startTransition(async () => {
      try {
        await createComplementarySwapAction({
          teacherAId: currentTeacherId,
          teacherBId: partnerId,
          dateA,
          periodA: Number(periodA),
          dateB,
          periodB: Number(periodB),
        });
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Swap failed");
      }
    });
  }

  function handleParallel() {
    setError("");
    startTransition(async () => {
      try {
        await createParallelSwapAction({
          teacherAId: currentTeacherId,
          teacherBId: partnerId,
          date: parallelDate,
        });
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Swap failed");
      }
    });
  }

  function handleCancel(groupId: string) {
    startTransition(async () => {
      await cancelSwapGroupAction(groupId);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="complementary">
        <TabsList>
          <TabsTrigger value="complementary">Complementary Hours</TabsTrigger>
          <TabsTrigger value="parallel">Parallel Sections</TabsTrigger>
        </TabsList>

        <TabsContent value="complementary">
          <Card>
            <CardHeader><CardTitle className="text-base">Swap Free Hours</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Partner Teacher</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger><SelectValue placeholder="Select colleague" /></SelectTrigger>
                  <SelectContent>
                    {otherTeachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Your class date</Label>
                  <DatePicker value={dateA} onChange={setDateA} />
                </div>
                <div>
                  <Label>Your period</Label>
                  <Input type="number" min={1} value={periodA} onChange={(e) => setPeriodA(e.target.value)} />
                </div>
                <div>
                  <Label>Partner&apos;s class date</Label>
                  <DatePicker value={dateB} onChange={setDateB} />
                </div>
                <div>
                  <Label>Partner&apos;s period</Label>
                  <Input type="number" min={1} value={periodB} onChange={(e) => setPeriodB(e.target.value)} />
                </div>
              </div>
              <Button disabled={pending || !partnerId || !dateA || !dateB} onClick={handleComplementary}>
                Request Swap
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parallel">
          <Card>
            <CardHeader><CardTitle className="text-base">Swap Parallel Sections</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Partner Teacher</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger><SelectValue placeholder="Select colleague" /></SelectTrigger>
                  <SelectContent>
                    {otherTeachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <DatePicker value={parallelDate} onChange={setParallelDate} />
              </div>
              <Button disabled={pending || !partnerId || !parallelDate} onClick={handleParallel}>
                Request Parallel Swap
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader><CardTitle className="text-base">My Active Swaps</CardTitle></CardHeader>
        <CardContent>
          {swapGroups.length === 0 ? (
            <p className="text-sm text-text-2 py-4 text-center">No active swaps.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {swapGroups.map((g) => {
                  const partnerId =
                    g.teacherAId === currentTeacherId ? g.teacherBId : g.teacherAId;
                  return (
                    <TableRow key={g.id}>
                      <TableCell>
                        <Badge variant="outline" hideIcon>{g.type.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>{teacherName(partnerId)}</TableCell>
                      <TableCell className="text-xs text-text-2">
                        {g.alterations.map((a) => (
                          <div key={a.id}>
                            {new Date(a.date).toISOString().slice(0, 10)} P{a.periodNo}: {a.classSection.name}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => handleCancel(g.id)}>
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
