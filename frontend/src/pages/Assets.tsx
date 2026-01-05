import { Boxes, Wrench } from 'lucide-react';

import AssetListTab from '@/components/assets/AssetListTab';
import AssetMaintenanceTab from '@/components/assets/AssetMaintenanceTab';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';

const Assets = () => {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('events.title') || 'Assets'}
        description={t('hostel.subtitle')}
        icon={<Boxes className="h-5 w-5" />}
        showDescriptionOnMobile={false}
      />

      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            <span className="hidden sm:inline">{t('nav.assets')}</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assets.maintenance')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4">
          <AssetListTab />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <AssetMaintenanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Assets;
