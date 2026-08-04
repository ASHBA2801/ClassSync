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
  note: string | null;
  createdAt: Date;
  alterations: Array<{
    id: string;
    date: Date;
    periodNo: number;
    classSection: { name: string };
    subject: { name: string };
  }>;
}

export function SwapManager({
  teachers,
  swapGroups,
}: {
  teachers: Teacher[];
  swapGroups: SwapGroup[];
}) {
  const [teacherA, setTeacherA] = useState("");
  const [teacherB, setTeacherB] = useState("");
  const [dateA, setDateA] = useState("");
  const [periodA, setPeriodA] = useState("1");
  const [dateB, setDateB] = useState("");
  const [periodB, setPeriodB] = useState("1");
  const [parallelDate, setParallelDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function teacherName(id: string) {
    return teachers.find((t) => t.id === id)?.name ?? id.slice(0, 8);
  }

  function handleComplementary() {
    setError("");
    startTransition(async () => {
      try {
        await createComplementarySwapAction({
          teacherAId: teacherA,
          teacherBId: teacherB,
          dateA,
          periodA: Number(periodA),
          dateB,
          periodB: Number(periodB),
          note: note || undefined,
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
          teacherAId: teacherA,
          teacherBId: teacherB,
          date: parallelDate,
          note: note || undefined,
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
          <TabsTrigger value="complementary">Complementary Free Hours</TabsTrigger>
          <TabsTrigger value="parallel">Parallel Sections</TabsTrigger>
        </TabsList>

        <TabsContent value="complementary">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Swap Complementary Free Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-text-2">
                Teacher A covers B&apos;s class when B is free, and vice versa on another day/period.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Teacher A</Label>
                  <Select value={teacherA} onValueChange={setTeacherA}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Teacher B</Label>
                  <Select value={teacherB} onValueChange={setTeacherB}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>A&apos;s class date</Label>
                  <DatePicker value={dateA} onChange={setDateA} />
                </div>
                <div>
                  <Label>A&apos;s period</Label>
                  <Input type="number" min={1} value={periodA} onChange={(e) => setPeriodA(e.target.value)} />
                </div>
                <div>
                  <Label>B&apos;s class date</Label>
                  <DatePicker value={dateB} onChange={setDateB} />
                </div>
                <div>
                  <Label>B&apos;s period</Label>
                  <Input type="number" min={1} value={periodB} onChange={(e) => setPeriodB(e.target.value)} />
                </div>
              </div>
              <Button disabled={pending || !teacherA || !teacherB || !dateA || !dateB} onClick={handleComplementary}>
                Create Swap
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parallel">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Swap Parallel Section Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-text-2">
                Both teachers teach the same sections at the same hours — swap who covers which section on a given date.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Teacher A</Label>
                  <Select value={teacherA} onValueChange={setTeacherA}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Teacher B</Label>
                  <Select value={teacherB} onValueChange={setTeacherB}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <DatePicker value={parallelDate} onChange={setParallelDate} />
                </div>
              </div>
              <Button disabled={pending || !teacherA || !teacherB || !parallelDate} onClick={handleParallel}>
                Create Parallel Swap
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Swaps</CardTitle>
        </CardHeader>
        <CardContent>
          {swapGroups.length === 0 ? (
            <p className="text-sm text-text-2 py-4 text-center">No active swaps.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Teachers</TableHead>
                  <TableHead>Alterations</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {swapGroups.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <Badge variant="outline" hideIcon>{g.type.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {teacherName(g.teacherAId)} ↔ {teacherName(g.teacherBId)}
                    </TableCell>
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
