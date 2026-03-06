# Migration Reference

## SQL New Table (Full)

```sql
CREATE TABLE IF NOT EXISTS public.your_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.school_branding(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_your_table_organization_id ON public.your_table(organization_id);
CREATE INDEX IF NOT EXISTS idx_your_table_school_id ON public.your_table(school_id);

ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

-- Then add 5 RLS policies (see nazim-multi-tenancy/reference.md)
```

## Laravel Migration (Full)

```php
Schema::create('your_table', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
    $table->uuid('organization_id')->nullable();
    $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
    $table->uuid('school_id')->nullable();
    $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
    $table->string('name');

    $table->timestamps();
    $table->timestamp('deleted_at')->nullable();

    $table->index('organization_id');
    $table->index('school_id');
});
```

## Eloquent Model UUID

```php
use Illuminate\Support\Str;

public $incrementing = false;
protected $keyType = 'string';

protected static function boot()
{
    parent::boot();
    static::creating(function ($model) {
        if (empty($model->id)) {
            $model->id = (string) Str::uuid();
        }
    });
}
```

## Function with search_path

```sql
CREATE OR REPLACE FUNCTION public.update_your_table_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
```

## Policy Naming

Under 63 chars. Examples:
- "Users can read org your_table" (28)
- "Users can insert org your_table" (29)
- "Service role full access your_table" (34)
