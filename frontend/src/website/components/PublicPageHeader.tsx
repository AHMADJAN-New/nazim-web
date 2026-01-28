import { cn } from "@/lib/utils";

interface PublicPageHeaderProps {
    title: string;
    description?: string;
    className?: string;
    children?: React.ReactNode;
    backgroundImage?: string;
}

export function PublicPageHeader({
    title,
    description,
    className,
    children,
    backgroundImage
}: PublicPageHeaderProps) {
    return (
        <section className={cn("bg-emerald-950 text-white py-16 md:py-24 relative overflow-hidden", className)}>
            {/* Background Image (Optional) */}
            {backgroundImage && (
                <div className="absolute inset-0 z-0">
                    <img
                        src={backgroundImage}
                        alt=""
                        className="w-full h-full object-cover opacity-20"
                    />
                    <div className="absolute inset-0 bg-emerald-950/80 mix-blend-multiply"></div>
                </div>
            )}

            {/* Islamic Pattern Overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none z-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M40 80c22.091 0 40-17.909 40-40h-8c0 17.673-14.327 32-32 32S8 57.673 8 40 22.327 8 40 8V0C17.909 0 0 17.909 0 40s17.909 40 40 40z'/%3E%3Cpath d='M40 0c22.091 0 40 17.909 40 40h-8c0-17.673-14.327-32-32-32S8 22.327 8 40H0c0-22.091 17.909-40 40-40z' opacity='0.5'/%3E%3Cpath d='M40 40l20 20-20 20-20-20 20-20zm0-40l20 20-20 20-20-20 20-20z' opacity='0.3' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                /* Note: The above path is a placeholder for a complex pattern. 
                   I will insert a proper geometric pattern in the next step or keep this if it looks good. 
                   Actually, let's use a better confirmed pattern now. */
            }}></div>

            {/* Alternative nicer pattern - Moroccan Zellige inspired geometric */}
            <div className="absolute inset-0 opacity-[0.07] pointer-events-none z-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`
            }}></div>

            <div className="container mx-auto px-4 relative z-10 text-center">
                <h1 className="text-3xl md:text-5xl font-bold mb-6 font-display tracking-tight leading-tight">
                    {title}
                </h1>
                {description && (
                    <p className="text-emerald-100/90 max-w-2xl mx-auto text-lg leading-relaxed">
                        {description}
                    </p>
                )}
                {children && (
                    <div className="mt-8 flex justify-center gap-4">
                        {children}
                    </div>
                )}
            </div>

            {/* Decorative bottom border */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400/50 to-emerald-500/0"></div>
        </section>
    );
}
