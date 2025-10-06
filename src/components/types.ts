// types.ts 
export interface DatasetSizeInfo{
    fileSizeMB:number;
    estimatedMemoryUsageMB:number;
    isLargeDataset:boolean;
    isVeryLargeDataset:boolean;
}

export interface FileInfoCardProps {
    fileName : string;
    rows : unknown[];
    headers : string[];
    jsonData : unknown[];
    lapResults : unknown[];
    clearData : () =>void;
    DatasetSizeInfo?: DatasetSizeInfo;
}