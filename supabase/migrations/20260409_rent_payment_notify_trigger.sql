-- Trigger: insert a notification row whenever rent is marked paid or partial.
-- This fires the notifications_send_push webhook → send-push edge function → Web Push.
CREATE OR REPLACE FUNCTION public.notify_rent_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_name text;
  month_label text;
BEGIN
  -- Fire only when payment_status moves to paid/partial AND amount actually changed
  IF NEW.payment_status IN ('paid','partial') AND (
    TG_OP = 'INSERT' OR
    OLD.payment_status IS DISTINCT FROM NEW.payment_status OR
    OLD.amount_paid    IS DISTINCT FROM NEW.amount_paid
  ) THEN
    SELECT full_name INTO tenant_name FROM public.tenants WHERE id = NEW.tenant_id;
    month_label := to_char(make_date(NEW.year, NEW.month, 1), 'Mon YYYY');

    INSERT INTO public.notifications (title, message, type, related_id, related_table)
    VALUES (
      CASE WHEN NEW.payment_status = 'paid' THEN 'Rent Paid' ELSE 'Partial Rent Received' END,
      CASE WHEN NEW.payment_status = 'paid'
        THEN COALESCE(tenant_name,'Tenant') || ' paid full rent ৳' || NEW.amount_paid::text || ' — ' || month_label
        ELSE COALESCE(tenant_name,'Tenant') || ' paid ৳' || NEW.amount_paid::text || ' (partial) — ' || month_label
      END,
      'payment',
      NEW.id,
      'rent_payments'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER rent_payment_notify
AFTER INSERT OR UPDATE ON public.rent_payments
FOR EACH ROW EXECUTE FUNCTION public.notify_rent_payment();
