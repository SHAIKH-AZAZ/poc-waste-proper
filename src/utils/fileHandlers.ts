// utils // fileHandlers.ts

export const handleFileUpload =(
    file :File ,
    setFile : (file:File) => void,
    setIsLoading : (loading : boolean)=> void
) => {
    setFile(file);
    setIsLoading(true);

    // Similating upload / processing
    setTimeout(() => {
        console.log(`Upload file: ${file.name}`);
        setIsLoading(false);
    } , 2000)
}