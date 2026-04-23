---
type: community
members: 4
---

# Building 3

**Members:** 4 nodes

## Members
- [[buildingMapper.ts]] - code - frontend\src\mappers\buildingMapper.ts
- [[mapBuildingApiToDomain()]] - code - frontend\src\mappers\buildingMapper.ts
- [[mapBuildingDomainToInsert()]] - code - frontend\src\mappers\buildingMapper.ts
- [[mapBuildingDomainToUpdate()]] - code - frontend\src\mappers\buildingMapper.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Building_3
SORT file.name ASC
```
