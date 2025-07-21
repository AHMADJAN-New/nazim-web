import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calendar,
  Award,
  Building,
  Calculator,
  MessageSquare
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Users,
      title: "Student Management",
      description: "Complete student information system with admission, records, and progress tracking"
    },
    {
      icon: GraduationCap,
      title: "Academic Management",
      description: "Manage classes, subjects, exams, and academic performance analytics"
    },
    {
      icon: BookOpen,
      title: "Library System",
      description: "Digital library management with book tracking and student borrowing records"
    },
    {
      icon: Calendar,
      title: "Attendance Tracking",
      description: "Real-time attendance management with automated reporting and notifications"
    },
    {
      icon: Calculator,
      title: "Fee Management",
      description: "Comprehensive fee collection, payment tracking, and financial reporting"
    },
    {
      icon: Building,
      title: "Hostel Management",
      description: "Complete hostel administration with room allocation and student management"
    },
    {
      icon: Award,
      title: "Hifz Progress",
      description: "Track Quran memorization progress with detailed analytics and reports"
    },
    {
      icon: MessageSquare,
      title: "Communication Hub",
      description: "Announcements, notifications, and parent-teacher communication platform"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            School Management
            <span className="text-primary block">Made Simple</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Comprehensive Islamic school management system designed to streamline 
            administration, enhance learning, and strengthen community connections.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">
                Get Started
              </Link>
            </Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Everything You Need to Manage Your School
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From student admissions to graduation, our comprehensive platform 
            covers every aspect of school management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">
              Ready to Transform Your School Management?
            </h3>
            <p className="text-primary-foreground/80 mb-6 max-w-2xl mx-auto">
              Join thousands of schools that have already digitized their operations 
              with our comprehensive management system.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth">
                Start Your Journey
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;