import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-20 glass-heavy border-b border-border/40 rounded-t-3xl">
      <div className="flex items-center justify-between px-5 py-3 md:px-12">
        <div
          onClick={() => navigate("/")}
          className="cursor-pointer select-none flex items-center"
        >
          <img src="/logo-ranna.png" alt="رنّة" className="h-8" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/search")}
          className="md:hidden h-9 w-9 rounded-full text-foreground hover:bg-muted active:scale-95 transition-transform"
        >
          <Search className="h-5 w-5" />
        </Button>
        <div className="hidden md:flex items-center gap-1 rounded-full bg-muted/60 p-1">
          <Button variant="ghost" onClick={() => navigate("/")} className="rounded-full font-fustat text-sm font-bold px-4 h-8">
            السَّاحة
          </Button>
          <Button variant="ghost" onClick={() => navigate("/search")} className="rounded-full font-fustat text-sm text-muted-foreground px-4 h-8">
            فتّش
          </Button>
          <Button variant="ghost" onClick={() => navigate("/favorites")} className="rounded-full font-fustat text-sm text-muted-foreground px-4 h-8">
            مُختاراتي
          </Button>
          {/* <Button variant="ghost" onClick={() => navigate("/account")} className="rounded-full font-fustat text-sm text-muted-foreground px-4 h-8">
            زاويتي
          </Button> */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
