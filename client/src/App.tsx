import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarTrigger, SidebarFooter } from "@/components/ui/sidebar";
import { LayoutDashboard, FileText, Leaf, Settings, LogOut, Search, Building2, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ReportDetail from "@/pages/report-detail";
import LandingPage from "@/pages/landing";
import Documents from "@/pages/documents";
import Clients from "@/pages/clients";
import Onboarding from "@/pages/onboarding";
import Fiscal from "@/pages/fiscal";
import Environmental from "@/pages/environmental";
import Valorizador from "@/pages/valorizador";
import kontaxLogo from "@assets/ChatGPT_Image_28_ene_2026,_08_27_52_p.m._1771574606787.png";

function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { title: "Dashboard", icon: LayoutDashboard, url: "/" },
    { title: "Mis Clientes", icon: Users, url: "/clients" },
    { title: "Visor Fiscal", icon: FileText, url: "/fiscal" },
    { title: "Contabilidad Ambiental", icon: Leaf, url: "/environmental" },
    { title: "Analista IA", icon: Search, url: "/valorizador" },
    { title: "Documentos", icon: Building2, url: "/documents" },
    { title: "Configuración", icon: Settings, url: "/settings" },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <img src={kontaxLogo} alt="Kontax Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-xl tracking-tight">Kontax</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} className="flex items-center gap-3 px-3 py-2">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.profileImageUrl ?? undefined} />
            <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</span>
            <span className="text-xs text-muted-foreground truncate capitalize">{user?.role}</span>
          </div>
          <button onClick={() => logout()} className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {isAuthenticated && <AppSidebar />}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 border-b bg-card sticky top-0 z-50">
          <div className="flex items-center gap-4">
            {isAuthenticated && <SidebarTrigger />}
            <div className="h-4 w-[1px] bg-border mx-2" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              {user && <span>{user.firstName} {user.lastName}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar en KONTAX..." 
                className="w-full bg-muted/50 border-0 rounded-md py-1.5 pl-8 text-sm focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6 bg-background/50">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/clients" component={Clients} />
            <Route path="/fiscal" component={Fiscal} />
            <Route path="/environmental" component={Environmental} />
            <Route path="/valorizador" component={Valorizador} />
            <Route path="/documents" component={Documents} />
            <Route path="/report/:id" component={ReportDetail} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function AppRoot() {
  const [location] = useLocation();

  if (location.startsWith("/onboarding/")) {
    return <Onboarding />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Router />
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppRoot />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

