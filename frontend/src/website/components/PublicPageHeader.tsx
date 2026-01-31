import { cn } from "@/lib/utils";
import { PublicHeroBackground } from "@/website/components/PublicHeroBackground";

interface PublicPageHeaderProps {
    title: string;
    description?: string;
    className?: string;
    children?: React.ReactNode;
    /** Optional hero image URL (e.g. from school header_image_path). When set, shows image with overlay. */
    backgroundImage?: string;
}

export function PublicPageHeader({
    title,
    description,
    className,
    children,
    backgroundImage,
}: PublicPageHeaderProps) {
    return (
        <section className={cn("relative overflow-hidden py-16 md:py-24 text-white", className)}>
            <PublicHeroBackground
                imageUrl={backgroundImage || undefined}
                patternOpacity={0.12}
            />

            <div className="container mx-auto px-4 relative z-10 text-center">
                <h1 className="text-3xl md:text-5xl font-bold mb-6 font-display tracking-tight leading-tight drop-shadow-sm">
                    {title}
                </h1>
                {description && (
                    <p className="text-emerald-100/95 max-w-2xl mx-auto text-lg leading-relaxed drop-shadow-sm">
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
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400/50 to-emerald-500/0 z-10" aria-hidden />
        </section>
    );
}
