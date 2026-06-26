'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ProgressBarProps {
  currentStep: number
  completedSteps: number[]
  onStepClick: (step: number) => void
}

export default function ProgressBar({ currentStep, completedSteps, onStepClick }: ProgressBarProps) {
  const t = useTranslations('Business')

  const stepLabels = [
    t('stepMedia'),
    t('stepPricing'),
    t('stepHours'),
    t('stepContact'),
    t('stepSubmit'),
  ]

  const isCompleted = (n: number) => completedSteps.includes(n)
  const isCurrent = (n: number) => n === currentStep && !isCompleted(n)

  return (
    <div className="glass rounded-2xl px-6 py-4 mb-6 w-full max-w-xl mx-auto">
      <nav role="navigation" aria-label={t('onboardingTitle')}>
        <div className="flex items-center w-full">
          {stepLabels.map((label, index) => {
            const stepNum = index + 1
            const completed = isCompleted(stepNum)
            const current = isCurrent(stepNum)
            return (
              <div key={stepNum} className="flex items-center flex-1 last:flex-none">
                {/* Step circle */}
                <div className="flex flex-col items-center gap-1">
                  {completed ? (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onStepClick(stepNum)}
                      className="w-8 h-8 rounded-full bg-white border border-[rgba(0,0,0,0.12)] flex items-center justify-center cursor-pointer"
                      aria-label={label}
                    >
                      <Check className="w-4 h-4 text-[#111111]" />
                    </motion.button>
                  ) : current ? (
                    <div
                      className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center"
                      aria-current="step"
                    >
                      <span className="text-[10px] font-bold">{stepNum}</span>
                    </div>
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full bg-white border border-[rgba(0,0,0,0.07)] flex items-center justify-center pointer-events-none"
                    >
                      <span className="text-[10px] font-bold text-[rgba(17,17,17,0.35)]">{stepNum}</span>
                    </div>
                  )}
                  {/* Step label */}
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest text-center leading-tight ${
                      current
                        ? 'text-[#111111]'
                        : completed
                          ? 'text-[#111111]'
                          : 'text-[rgba(17,17,17,0.35)]'
                    }`}
                  >
                    {label}
                  </span>
                </div>

                {/* Connector line (not after last step) */}
                {index < stepLabels.length - 1 && (
                  <div className="flex-1 h-px bg-[rgba(0,0,0,0.07)] mx-2 mb-4" />
                )}
              </div>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
