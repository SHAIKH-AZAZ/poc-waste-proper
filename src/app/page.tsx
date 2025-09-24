"use client";
import FileUpload  from "@/components/customs/FileUpload";
import { useState } from "react";
import {handleFileUpload as uploadHandler} from "@/utils/fileHandlers"
import { HeadDemo } from "@/components/customs/Heading";


export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);


  // returning function
  return(
  <div className="flex flex-col items-center mx-auto mt-10">

    <div>
      <HeadDemo />
    </div>
    <div className="max-w-md mx-auto mt-10">
    <FileUpload  onFileUpload={(file) => uploadHandler(file , setFile , setIsLoading)} isLoading={isLoading} />
    {
      file && !isLoading  &&(
        <div>
          <p>Selected File</p>
          <p>{file?.name}</p>
          <p>{(file?.size / 1024).toFixed(2) } KB</p>
        </div>
      )}
      </div>
  </div>)
}
