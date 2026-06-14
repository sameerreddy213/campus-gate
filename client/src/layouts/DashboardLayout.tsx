import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Building2, Users, GraduationCap, Shield, BarChart3, ClipboardList,
  Home, UserPlus, FileText, Upload, History, LogOut, Bell, Menu,
  ChevronLeft, User, Phone, Calendar, CheckSquare, Lock, ScrollText
} from "lucide-react";
import type { UserRole } from "@/types";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import api from "@/lib/api";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navConfig: Record<UserRole, NavItem[]> = {
  "dev-admin": [
    { label: "Dashboard", path: "/dev-admin", icon: Home },
    { label: "Colleges", path: "/dev-admin/colleges", icon: Building2 },
    { label: "Add College", path: "/dev-admin/add-college", icon: UserPlus },
    { label: "Add Admin", path: "/dev-admin/add-admin", icon: Shield },
    { label: "Analytics", path: "/dev-admin/analytics", icon: BarChart3 },
    { label: "Audit Logs", path: "/dev-admin/audit-logs", icon: ScrollText },
  ],
  "college-admin": [
    { label: "Dashboard", path: "/college-admin", icon: Home },
    { label: "Wardens", path: "/college-admin/wardens", icon: Shield },
    { label: "Watchmen", path: "/college-admin/watchmen", icon: User },
    { label: "Students", path: "/college-admin/students", icon: GraduationCap },
    { label: "Assign Students", path: "/college-admin/assign", icon: Users },
    { label: "Outing Requests", path: "/college-admin/requests", icon: ClipboardList },
    { label: "Reports", path: "/college-admin/reports", icon: FileText },
    { label: "Audit Logs", path: "/college-admin/audit-logs", icon: ScrollText },
    { label: "Settings", path: "/college-admin/settings", icon: CheckSquare },
  ],
  warden: [
    { label: "Dashboard", path: "/warden", icon: Home },
    { label: "Assigned Students", path: "/warden/students", icon: GraduationCap },
    { label: "Outing Requests", path: "/warden/requests", icon: ClipboardList },
    { label: "History", path: "/warden/history", icon: History },
  ],
  student: [
    { label: "Dashboard", path: "/student", icon: Home },
    { label: "Raise Request", path: "/student/raise-request", icon: Calendar },
    { label: "My Requests", path: "/student/requests", icon: ClipboardList },
    { label: "History", path: "/student/history", icon: History },
  ],
  parent: [
    { label: "Dashboard", path: "/parent", icon: Home },
    { label: "History", path: "/parent/history", icon: History },
  ],
  watchman: [
    { label: "Dashboard", path: "/watchman", icon: Home },
  ],
};

const roleLabels: Record<UserRole, string> = {
  "dev-admin": "Developer Admin",
  "college-admin": "College Admin",
  warden: "Warden",
  student: "Student",
  parent: "Parent",
  watchman: "Watchman",
};

function SidebarNav({ items, collapsed, onItemClick }: { items: NavItem[]; collapsed: boolean; onItemClick?: () => void }) {
  const location = useLocation();
  return (
    <nav className="flex flex-col gap-1 px-3 py-2">
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardLayout() {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const [enableGateSecurity, setEnableGateSecurity] = useState(true);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data);
      setUnreadCount(res.data.unreadCount);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark notifications read", error);
    }
  };

  // Where a notification should take the current role when clicked.
  const requestsPathByRole: Partial<Record<UserRole, string>> = {
    student: "/student/requests",
    warden: "/warden/requests",
    parent: "/parent",
    watchman: "/watchman",
    "college-admin": "/college-admin/requests",
    "dev-admin": "/dev-admin",
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.read) {
      setNotifications(prev => prev.map(n => (n._id === notif._id ? { ...n, read: true } : n)));
      setUnreadCount(c => Math.max(0, c - 1));
      try {
        await api.put(`/notifications/${notif._id}/read`);
      } catch (error) {
        console.error("Failed to mark notification read", error);
      }
    }
    const dest = user ? requestsPathByRole[user.role] : undefined;
    if (dest) navigate(dest);
  };

  // Redirect to login only once the auth check has finished (otherwise a hard
  // refresh with a valid token bounces the user to /login before /auth/me resolves)
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }

    // Role guard: keep users inside their own section
    const section = location.pathname.split("/")[1];
    if (section in navConfig && section !== user.role) {
      navigate(`/${user.role}`, { replace: true });
    }
  }, [user, isLoading, navigate, location.pathname]);

  useEffect(() => {
    if (!user) {
      return;
    }

    // Role-based logic
    if (user.role === "college-admin") {
      api.get('/college-admin/settings')
        .then(res => {
          if (res.data.data && res.data.data.enableGateSecurity !== undefined) {
            setEnableGateSecurity(res.data.data.enableGateSecurity);
          }
        })
        .catch(err => console.error("Failed to fetch settings", err));
    }

    // Initial Fetch
    fetchNotifications();

    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  if (isLoading || !user) return null;

  let navItems = navConfig[user.role] || [];

  // Filter out Watchman from College Admin if disabled
  if (user.role === "college-admin" && !enableGateSecurity) {
    navItems = navItems.filter(item => item.label !== "Watchmen");
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          CG
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-foreground">CampusGate</span>
            <span className="text-[11px] text-sidebar-foreground/60">{roleLabels[user.role]}</span>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <SidebarNav items={navItems} collapsed={collapsed} onItemClick={() => setMobileOpen(false)} />
      </div>
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-sidebar-foreground/70"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className={cn(
          "h-full border-r border-sidebar-border bg-sidebar transition-all duration-200 shrink-0",
          collapsed ? "w-16" : "w-60"
        )}>
          {sidebarContent}
        </aside>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top navbar */}
        <header className="flex h-14 items-center justify-between border-b px-4 bg-card shrink-0">
          <div className="flex items-center gap-2">
            {isMobile ? (
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-60 p-0">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
                  {sidebarContent}
                </SheetContent>
              </Sheet>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
                <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Notification Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center border-2 border-background">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h4 className="font-semibold text-sm">Notifications</h4>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-auto text-xs text-primary" onClick={markAllRead}>
                      Mark all read
                    </Button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No notifications
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {notifications.map((notif: any) => (
                        <div
                          key={notif._id}
                          onClick={() => handleNotificationClick(notif)}
                          className={cn(
                            "px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer",
                            !notif.read && "bg-muted/30"
                          )}
                        >
                          <div className="flex gap-3">
                            <div className={cn(
                              "mt-1 h-2 w-2 rounded-full shrink-0",
                              !notif.read ? "bg-primary" : "bg-transparent"
                            )} />
                            <div className="flex-1 space-y-1">
                              <p className={cn("text-sm leading-none", !notif.read && "font-medium")}>
                                {notif.message}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {user.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  {!isMobile && <span className="text-sm font-medium">{user.name}</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>



        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/10">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname} className="w-full">
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div >
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div >
  );
}
