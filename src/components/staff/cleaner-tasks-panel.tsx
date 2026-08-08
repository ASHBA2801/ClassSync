"use client";

import { useRouter } from "next/navigation";
import { completeCleanerTaskAction } from "@/actions/staff-modules";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Task {
  id: string;
  zoneName: string;
  tasks: unknown;
  isComplete: boolean;
  date: Date;
}

export function CleanerTasksPanel({ tasks }: { tasks: Task[] }) {
  const router = useRouter();

  async function complete(id: string) {
    await completeCleanerTaskAction(id);
    router.refresh();
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {task.zoneName}
              <Badge variant={task.isComplete ? "success" : "warning"}>
                {task.isComplete ? "Done" : "Pending"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="mb-3 list-disc pl-4 text-sm text-text-2">
              {(Array.isArray(task.tasks) ? task.tasks as string[] : []).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
            {!task.isComplete && (
              <Button size="sm" onClick={() => complete(task.id)}>Mark Complete</Button>
            )}
          </CardContent>
        </Card>
      ))}
      {tasks.length === 0 && <p className="text-sm text-text-2">No cleaning tasks assigned for today.</p>}
    </div>
  );
}
