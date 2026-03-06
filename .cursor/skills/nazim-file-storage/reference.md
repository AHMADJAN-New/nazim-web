# File Storage Reference

## Folder Structure (summary)

```
storage/app/
├── private/organizations/{org}/schools/{school}/
│   ├── students/{id}/pictures|documents/
│   ├── staff/{id}/documents/
│   ├── courses/{id}/documents/
│   ├── dms/{doc_type}/{doc_id}/files/
│   ├── events/{id}/attachments|photos/
│   ├── templates/id-cards|certificates/
│   └── reports/{report_key}/
└── public/organizations/{org}/schools/{school}/
    ├── staff/{id}/pictures/
    ├── events/{id}/banners|thumbnails/
    └── website/ (library, media, courses, pages, forms)
```

## Adding a New Resource Type

1. Add a method to FileStorageService (e.g. `storeYourResourceFile`) that builds path with org_id, school_id, and resource id.
2. Use UUID-based naming; inject FileStorageService in controller; use the new method in upload endpoint.
3. Use getPrivateDownloadUrl or getPublicUrl as appropriate; use downloadFile for download response.
