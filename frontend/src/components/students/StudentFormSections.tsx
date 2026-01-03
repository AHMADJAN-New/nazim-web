import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface SectionCardProps {
    title: string;
    className?: string;
    children: React.ReactNode;
    description?: React.ReactNode;
}

export function SectionCard({ title, className, children, description }: SectionCardProps) {
    return (
        <Card className={cn('shadow-sm', className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">{title}</CardTitle>
                {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

interface GridSectionProps {
    title: string;
    columns?: 1 | 2 | 3;
    children: React.ReactNode;
    description?: React.ReactNode;
}

export function GridSection({ title, columns = 2, children, description }: GridSectionProps) {
    const gridClass =
        columns === 3
            ? 'grid grid-cols-1 md:grid-cols-3 gap-4'
            : columns === 2
                ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                : 'grid grid-cols-1 gap-4';

    return (
        <SectionCard title={title} description={description}>
            <div className={gridClass}>{children}</div>
        </SectionCard>
    );
}

interface GroupProps {
    children: React.ReactNode;
    title?: string;
    description?: React.ReactNode;
    className?: string;
}

export function FormGroup({ children, title, description, className }: GroupProps) {
    if (!title) {
        return <div className={cn('space-y-4', className)}>{children}</div>;
    }
    return (
        <SectionCard title={title} description={description} className={className}>
            <div className="space-y-4">{children}</div>
        </SectionCard>
    );
}

export const PersonalInformationSection: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useLanguage();
    return <GridSection title={t('students.personalInfo') || 'Personal Information'}>{children}</GridSection>;
};

export const AdmissionInformationSection: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useLanguage();
    return <GridSection title={t('students.admissionInfo') || 'Admission Information'}>{children}</GridSection>;
};

export const AddressInformationSection: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useLanguage();
    return <GridSection title={t('students.addressInfo') || 'Address Information'} columns={3}>{children}</GridSection>;
};

export const GuardianInformationSection: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useLanguage();
    return <GridSection title={t('students.guardianInfo') || 'Guardian Information'}>{children}</GridSection>;
};

export const OtherInformationSection: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useLanguage();
    return <FormGroup title={t('students.otherInfo') || 'Other Information'}>{children}</FormGroup>;
};


