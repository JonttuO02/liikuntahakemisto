'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Upload } from 'lucide-react'

interface UploadDropZoneProps {
  label: string
  allowMultiple: boolean
  maxFileSizeMB: number
  maxFiles?: number
  selectedFiles: File[]
  onFilesSelected: (files: File[]) => void
}

export default function UploadDropZone({
  label,
  allowMultiple,
  maxFileSizeMB,
  maxFiles,
  selectedFiles,
  onFilesSelected,
}: UploadDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function validateAndSelect(rawFiles: File[]) {
    const maxBytes = maxFileSizeMB * 1024 * 1024
    const valid = rawFiles.filter(
      (f) => f.type.startsWith('image/') && f.size <= maxBytes
    )
    if (maxFiles !== undefined) {
      onFilesSelected(valid.slice(0, maxFiles))
    } else {
      onFilesSelected(valid)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    validateAndSelect(files)
  }

  function handleClick() {
    fileInputRef.current?.click()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fileInputRef.current?.click()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      validateAndSelect(Array.from(e.target.files))
    }
  }

  const baseClass =
    'border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 min-h-[96px] [transition:border-color_150ms_var(--ease-out)] cursor-pointer'
  const draggingClass = 'border-[#111111] bg-[rgba(17,17,17,0.03)]'
  const inactiveClass =
    'border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.25)]'

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`${baseClass} ${isDragging ? draggingClass : inactiveClass}`}
      >
        {selectedFiles.length === 0 ? (
          <>
            <Upload className="w-6 h-6 text-[rgba(17,17,17,0.35)]" />
            <span className="text-sm text-[rgba(17,17,17,0.45)] text-center">
              {isDragging ? 'Pudota tiedosto tähän' : label}
            </span>
          </>
        ) : (
          <div className="flex flex-row gap-2 flex-wrap justify-center">
            {selectedFiles.map((file) => (
              <motion.img
                key={file.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
            ))}
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={allowMultiple}
        className="sr-only"
        onChange={handleInputChange}
      />
    </div>
  )
}
