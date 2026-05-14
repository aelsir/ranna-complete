import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  signOut: () => Promise<void>;
}

export function DashboardUnauthorized({ signOut }: Props) {
  return (
    <div dir="rtl" className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-sm mx-auto p-8 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <LogOut className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="font-fustat font-bold text-xl text-foreground">غير مصرح</h1>
        <p className="text-sm font-fustat text-muted-foreground">
          هذا الحساب ليس لديه صلاحية الوصول إلى لوحة التحكم.
        </p>
        <Button variant="outline" className="w-full" onClick={() => signOut()}>
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}
