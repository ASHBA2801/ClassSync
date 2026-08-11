import { Badge } from "@/components/ui/badge";
import { payoutStatusBadgeVariant, payoutStatusLabel } from "@/lib/payroll/payout-status";

interface Props {
  status: string;
}

export function PayoutStatusBadge({ status }: Props) {
  return (
    <Badge variant={payoutStatusBadgeVariant(status)}>
      {payoutStatusLabel(status)}
    </Badge>
  );
}
