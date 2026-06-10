'use client'

import { useRef, useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, X } from 'lucide-react'

interface UploadDropZoneProps {
  label: string
  allowMultiple: boolean
  maxFileSizeMB: number
  maxFiles?: number
  selectedFiles: File[]
  onFilesSelected: (files: File[]) => void
  onRemove?: (index: number) => void
  disabled?: boolean
}

export default function UploadDropZone({
  label,
  allowMultiple,
  maxFileSizeMB,
  maxFiles,
  selectedFiles,
  onFilesSelected,
  onRemove,
  disabled = false,
}: UploadDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Create object URLs once per selectedFiles reference; revoke on change/unmount to prevent leaks.
  const previewUrls = useMemo(
    () => selectedFiles.map((f) => URL.createObjectURL(f)),
    [selectedFiles]
  )
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

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
    <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
      {/* Clickable drop target — always shows upload prompt */}
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
        <Upload className="w-6 h-6 text-[rgba(17,17,17,0.35)]" />
        <span className="text-sm text-[rgba(17,17,17,0.45)] text-center">
          {isDragging ? 'Pudota tiedosto tähän' : label}
        </span>
        {selectedFiles.length > 0 && (
          <span className="text-[10px] text-[rgba(17,17,17,0.45)]">
            {selectedFiles.length} tiedosto{selectedFiles.length !== 1 ? 'a' : ''} valittu
          </span>
        )}
      </div>

      {/* Thumbnail strip — outside the clickable zone */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-row gap-2 flex-wrap mt-2">
          {selectedFiles.map((file, index) => (
            <div key={file.name} className="relative">
              <motion.img
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                src={previewUrls[index]}
                alt={file.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(index) }}
                  aria-label="Poista kuva"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#111111] text-white flex items-center justify-center hover:bg-[#333333] [transition:background-color_150ms_var(--ease-out)]"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

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
