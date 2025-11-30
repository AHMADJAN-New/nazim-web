<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nazim School Management System</title>
    <meta name="description" content="Comprehensive Islamic school management platform for student management, academics, finance, and communication.">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f8fafc;
            color: #1e293b;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        nav {
            background: white;
            border-bottom: 1px solid #e2e8f0;
            padding: 1rem 0;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .nav-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1.25rem;
            font-weight: bold;
            color: #0b0b56;
        }
        .nav-links {
            display: flex;
            gap: 2rem;
            align-items: center;
        }
        .nav-links a {
            text-decoration: none;
            color: #64748b;
            transition: color 0.2s;
        }
        .nav-links a:hover {
            color: #1e293b;
        }
        .btn {
            padding: 0.5rem 1.5rem;
            border-radius: 0.5rem;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.2s;
            display: inline-block;
        }
        .btn-ghost {
            color: #64748b;
            background: transparent;
        }
        .btn-ghost:hover {
            color: #1e293b;
        }
        .btn-primary {
            background: #0b0b56;
            color: white;
        }
        .btn-primary:hover {
            background: #0a0a4a;
        }
        .hero {
            padding: 4rem 0;
            text-align: center;
        }
        .hero h1 {
            font-size: 3.5rem;
            font-weight: bold;
            margin-bottom: 1rem;
            line-height: 1.2;
        }
        .hero .highlight {
            color: #0b0b56;
        }
        .hero p {
            font-size: 1.25rem;
            color: #64748b;
            margin-bottom: 2rem;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
        }
        .cta-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-bottom: 3rem;
        }
        .features {
            padding: 4rem 0;
            background: white;
        }
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }
        .feature-card {
            padding: 2rem;
            border-radius: 0.75rem;
            border: 1px solid #e2e8f0;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .feature-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .feature-icon {
            width: 3rem;
            height: 3rem;
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1rem;
            font-size: 1.5rem;
        }
        .feature-card h3 {
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
        }
        .feature-card p {
            color: #64748b;
        }
        @media (max-width: 768px) {
            .hero h1 {
                font-size: 2rem;
            }
            .nav-links {
                display: none;
            }
        }
    </style>
</head>
<body>
    <nav>
        <div class="container nav-content">
            <div class="logo">
                🎓 Nazim SMS
            </div>
            <div class="nav-links">
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#contact">Contact</a>
                <a href="{{ env('FRONTEND_URL', 'http://localhost:8080') }}/auth" class="btn btn-ghost">Sign In</a>
                <a href="{{ env('FRONTEND_URL', 'http://localhost:8080') }}/auth" class="btn btn-primary">Get Started</a>
            </div>
        </div>
    </nav>

    <section class="hero">
        <div class="container">
            <h1>
                Transform Your<br>
                <span class="highlight">School Management</span>
            </h1>
            <p>
                Streamline operations, enhance learning outcomes, and strengthen community connections
                with our comprehensive Islamic school management platform.
            </p>
            <div class="cta-buttons">
                <a href="{{ env('FRONTEND_URL', 'http://localhost:8080') }}/auth" class="btn btn-primary" style="font-size: 1.125rem; padding: 0.75rem 2rem;">
                    Start Free Trial →
                </a>
                <a href="#features" class="btn btn-ghost" style="font-size: 1.125rem; padding: 0.75rem 2rem;">
                    Watch Demo
                </a>
            </div>
        </div>
    </section>

    <section id="features" class="features">
        <div class="container">
            <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 1rem;">Features</h2>
            <p style="text-align: center; color: #64748b; margin-bottom: 2rem;">
                Everything you need to manage your school efficiently
            </p>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon" style="background: #dbeafe; color: #2563eb;">👥</div>
                    <h3>Student Management</h3>
                    <p>Complete student information system with admission, records, and progress tracking</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon" style="background: #dcfce7; color: #16a34a;">🎓</div>
                    <h3>Academic Management</h3>
                    <p>Manage classes, subjects, exams, and academic performance analytics</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon" style="background: #f3e8ff; color: #9333ea;">📚</div>
                    <h3>Library System</h3>
                    <p>Digital library management with book tracking and student borrowing records</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon" style="background: #fed7aa; color: #ea580c;">📅</div>
                    <h3>Attendance Tracking</h3>
                    <p>Real-time attendance management with automated reporting and notifications</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon" style="background: #fee2e2; color: #dc2626;">💰</div>
                    <h3>Fee Management</h3>
                    <p>Comprehensive fee collection, payment tracking, and financial reporting</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon" style="background: #e0e7ff; color: #4f46e5;">🏢</div>
                    <h3>Hostel Management</h3>
                    <p>Complete hostel administration with room allocation and student management</p>
                </div>
            </div>
        </div>
    </section>

    <script>
        // Auto-redirect to frontend React app
        const frontendUrl = '{{ env('FRONTEND_URL', 'http://localhost:8080') }}';
        // Redirect immediately to show the full React landing page
        window.location.href = frontendUrl;
    </script>
</body>
</html>
