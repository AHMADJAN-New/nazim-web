import { Boxes, Wrench } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AssetListTab from '@/components/assets/AssetListTab';
import AssetMaintenanceTab from '@/components/assets/AssetMaintenanceTab';
import { useLanguage } from '@/hooks/useLanguage';

const Assets = () => {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Boxes className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-semibold">{t('assets.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('assets.subtitle')}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            {t('nav.assets')}
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            {t('assets.maintenance')}
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
