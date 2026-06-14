import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, GraduationCap, Clock, Menu, X, ArrowRight, Lock, Book, Mail } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2
        }
    }
};

const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary/20">
            {/* Header */}
            <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
                        <Shield className="h-6 w-6" />
                        <span>CampusGate</span>
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-6">
                        <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</a>
                        <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">How it Works</a>
                        <Link to="/login">
                            <Button>Login</Button>
                        </Link>
                    </nav>

                    {/* Mobile Menu Toggle */}
                    <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>

                {/* Mobile Nav */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t bg-background p-4 flex flex-col gap-4 shadow-lg animate-in slide-in-from-top-5">
                        <a href="#features" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Features</a>
                        <a href="#how-it-works" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
                        <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                            <Button className="w-full">Login</Button>
                        </Link>
                    </div>
                )}
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative py-20 md:py-32 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background z-0" />
                    <div className="container mx-auto px-4 text-center space-y-8 max-w-4xl relative z-10">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20"
                        >
                            New: Parent Dashboard 2.0
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.1 }}
                            className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-tight"
                        >
                            Secure & Smart <br className="hidden md:block" />
                            <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                                Campus Gate Management
                            </span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
                        >
                            Streamline outing requests, automate approvals, and ensure student safety with a comprehensive digital gate pass system for students, parents, wardens, and security.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.3 }}
                            className="pt-4 flex flex-col sm:flex-row justify-center gap-4"
                        >
                            <Link to="/login">
                                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
                                    Login <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full w-full sm:w-auto" asChild>
                                <a href="#access">Request Access</a>
                            </Button>
                        </motion.div>

                        {/* Stats/Trust Indicators */}
                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            animate="show"
                            className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center opacity-80"
                        >
                            {[
                                { label: "Students", value: "10k+" },
                                { label: "Uptime", value: "99.9%" },
                                { label: "Breaches", value: "0" },
                                { label: "Support", value: "24/7" }
                            ].map((stat, index) => (
                                <motion.div key={index} variants={staggerItem}>
                                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* Features Grid */}
                <section id="features" className="py-20 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <motion.div
                            {...fadeInUp}
                            className="text-center max-w-3xl mx-auto mb-16"
                        >
                            <h2 className="text-3xl font-bold tracking-tight mb-4">Everything you need to manage campus entry</h2>
                            <p className="text-muted-foreground text-lg">
                                A complete suite of tools for students, wardens, parents, and security personnel.
                            </p>
                        </motion.div>

                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true }}
                            className="grid md:grid-cols-3 gap-8"
                        >
                            <motion.div variants={staggerItem}>
                                <Card className="border-none shadow-lg bg-background hover:-translate-y-1 transition-transform duration-300">
                                    <CardContent className="pt-8 pb-8 px-6 space-y-4 text-center">
                                        <div className="mx-auto p-4 bg-blue-100 dark:bg-blue-900/20 rounded-2xl w-fit text-blue-600 dark:text-blue-400">
                                            <Clock className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-xl font-bold">Instant Approvals</h3>
                                        <p className="text-muted-foreground leading-relaxed">
                                            Say goodbye to paper forms. Outing requests are processed in seconds with automated workflows for wardens and parents.
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div variants={staggerItem}>
                                <Card className="border-none shadow-lg bg-background hover:-translate-y-1 transition-transform duration-300">
                                    <CardContent className="pt-8 pb-8 px-6 space-y-4 text-center">
                                        <div className="mx-auto p-4 bg-green-100 dark:bg-green-900/20 rounded-2xl w-fit text-green-600 dark:text-green-400">
                                            <Shield className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-xl font-bold">Enhanced Security</h3>
                                        <p className="text-muted-foreground leading-relaxed">
                                            Robust role-based access control (RBAC) and strict gate verification protocols ensure only authorized exits.
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div variants={staggerItem}>
                                <Card className="border-none shadow-lg bg-background hover:-translate-y-1 transition-transform duration-300">
                                    <CardContent className="pt-8 pb-8 px-6 space-y-4 text-center">
                                        <div className="mx-auto p-4 bg-purple-100 dark:bg-purple-900/20 rounded-2xl w-fit text-purple-600 dark:text-purple-400">
                                            <GraduationCap className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-xl font-bold">Student Centric</h3>
                                        <p className="text-muted-foreground leading-relaxed">
                                            Designed for students to easily manage their outings, track history, and stay connected with campus authorities.
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* How it Works / Workflow */}
                <section id="how-it-works" className="py-20 container mx-auto px-4">
                    <motion.div {...fadeInUp} className="text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tight">How it Works</h2>
                    </motion.div>

                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        className="grid md:grid-cols-4 gap-8 relative"
                    >
                        {/* Connector Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent -z-10" />

                        {[
                            { step: "1", title: "Request", desc: "Student submits outing request with details." },
                            { step: "2", title: "Parent Approval", desc: "Parent receives SMS/Notification and approves." },
                            { step: "3", title: "Warden Sanction", desc: "Warden reviews and sanctions the gate pass." },
                            { step: "4", title: "Gate Check", desc: "Watchman verifies the pass and logs exit/entry." }
                        ].map((item, index) => (
                            <motion.div key={index} variants={staggerItem} className="text-center space-y-4 bg-background p-4">
                                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mx-auto shadow-md">{item.step}</div>
                                <h3 className="font-semibold text-lg">{item.title}</h3>
                                <p className="text-sm text-muted-foreground">{item.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>

                    <div className="mt-12 text-center">
                        <Link to="/documentation">
                            <Button variant="outline" size="lg" className="gap-2">
                                <Book className="h-4 w-4" />
                                View Detailed Guide
                            </Button>
                        </Link>
                    </div>
                </section>

                {/* Security Section */}
                <section id="security" className="py-20 bg-slate-50 dark:bg-slate-900/50">
                    <div className="container mx-auto px-4">
                        <motion.div {...fadeInUp} className="text-center mb-16">
                            <h2 className="text-3xl font-bold tracking-tight mb-4">Enterprise-Grade Security</h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                Built with a security-first approach to protect sensitive student data and ensure campus safety.
                            </p>
                        </motion.div>
                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true }}
                            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
                        >
                            <motion.div variants={staggerItem} className="bg-background p-6 rounded-xl shadow-sm border space-y-3">
                                <Lock className="h-10 w-10 text-primary mb-2" />
                                <h3 className="font-bold text-lg">RBAC Control</h3>
                                <p className="text-sm text-muted-foreground">Strict Role-Based Access Control ensuring users only access what they're authorized to.</p>
                            </motion.div>
                            <motion.div variants={staggerItem} className="bg-background p-6 rounded-xl shadow-sm border space-y-3">
                                <Shield className="h-10 w-10 text-primary mb-2" />
                                <h3 className="font-bold text-lg">JWT Authentication</h3>
                                <p className="text-sm text-muted-foreground">Stateless, secure session management using JSON Web Tokens with automatic expiry.</p>
                            </motion.div>
                            <motion.div variants={staggerItem} className="bg-background p-6 rounded-xl shadow-sm border space-y-3">
                                <div className="text-primary mb-2">
                                    <Shield className="h-10 w-10" />
                                </div>
                                <h3 className="font-bold text-lg">Data Encryption</h3>
                                <p className="text-sm text-muted-foreground">All sensitive data including passwords are hashed using BCrypt before storage.</p>
                            </motion.div>
                            <motion.div variants={staggerItem} className="bg-background p-6 rounded-xl shadow-sm border space-y-3">
                                <Clock className="h-10 w-10 text-primary mb-2" />
                                <h3 className="font-bold text-lg">Audit Logs</h3>
                                <p className="text-sm text-muted-foreground">Comprehensive tracking of all entry/exit events for full accountability.</p>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* Request Access Section */}
                <section id="access" className="py-20 container mx-auto px-4">
                    <motion.div {...fadeInUp} className="max-w-3xl mx-auto">
                        <Card className="border-none shadow-xl bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
                            <CardContent className="p-8 md:p-12 text-center space-y-6">
                                <div className="mx-auto p-4 bg-primary/10 rounded-2xl w-fit text-primary">
                                    <Mail className="h-8 w-8" />
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-3xl font-bold tracking-tight">Request Access</h2>
                                    <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
                                        CampusGate is an independent project built and maintained by a single developer.
                                        It isn't open for public sign-up. If you'd like access for your institution,
                                        get in touch and I'll set up an account for you.
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
                                    <Button size="lg" className="h-12 px-8 rounded-full shadow-lg hover:shadow-xl transition-all" asChild>
                                        <a href="mailto:contact@sameerreddy.in?subject=CampusGate Access Request">
                                            <Mail className="mr-2 h-5 w-5" />
                                            contact@sameerreddy.in
                                        </a>
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground pt-2">
                                    Existing users can sign in from the Login page.
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </section>

                {/* Contact CTA Section */}
                <section id="contact" className="py-20 bg-primary text-primary-foreground">
                    <motion.div {...fadeInUp} className="container mx-auto px-4 text-center space-y-6">
                        <h2 className="text-3xl md:text-4xl font-bold">Ready to modernize your campus?</h2>
                        <p className="text-lg opacity-90 max-w-2xl mx-auto">Sign in to your account, or reach out to request access for your institution.</p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
                            <Link to="/login">
                                <Button size="lg" variant="secondary" className="h-12 px-8 font-bold shadow-lg text-primary">
                                    Login Now
                                </Button>
                            </Link>
                            <Button size="lg" variant="outline" className="h-12 px-8 font-bold bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
                                <a href="mailto:contact@sameerreddy.in">Contact Support</a>
                            </Button>
                        </div>
                    </motion.div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t py-12 bg-background text-muted-foreground">
                <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-2 space-y-4">
                        <div className="flex items-center gap-2 font-bold text-xl text-foreground">
                            <Shield className="h-6 w-6" />
                            <span>CampusGate</span>
                        </div>
                        <p className="text-sm max-w-xs">
                            Advanced gate management system for modern educational institutions. Prioritizing safety and efficiency.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground mb-4">Product</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                            <li><a href="#access" className="hover:text-primary transition-colors">Request Access</a></li>
                            <li><a href="#security" className="hover:text-primary transition-colors">Security</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground mb-4">Support</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/documentation" className="hover:text-primary transition-colors">Documentation</Link></li>
                            <li><a href="mailto:contact@sameerreddy.in" className="hover:text-primary transition-colors">Help Center</a></li>
                            <li><a href="mailto:contact@sameerreddy.in" className="hover:text-primary transition-colors">Contact</a></li>
                        </ul>
                    </div>
                </div>
                <div className="container mx-auto px-4 pt-8 border-t text-center text-sm">
                    <p>&copy; {new Date().getFullYear()} CampusGate. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
