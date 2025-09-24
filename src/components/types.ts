// types.ts 
export interface DatasetSizeInfo{
    fileSizeMB:number;
    estimatedMemoryUsageMB:number;
    isLargeDataset:boolean;
    isVeryLargeDataset:boolean;
}

export interface FileInfoCardProps {
    fileName : string;
    rows : any[];
    headers : string[];
    jsonData : any[];
    lapResults : any[];
    clearData : () =>void;
    DatasetSizeInfo?: DatasetSizeInfo;
}