import { isValid, parseISO } from "date-fns";
import { z } from "zod";

export const isoDateString = z
  .string()
  .min(1, "Date is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
  .refine((value) => isValid(parseISO(value)), "Invalid date");
