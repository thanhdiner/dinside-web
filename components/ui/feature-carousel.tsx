/*
 ! Add the following to your .globals.css

       .animated-cards::before {
         @apply pointer-events-none absolute select-none rounded-3xl opacity-0 transition-opacity duration-300 hover:opacity-100;
         background: radial-gradient(
           1000px circle at var(--x) var(--y),
           #10b981 0,
           #6ef7cc 10%,
           #38bdf8 25%,
           #10b981 35%,
           rgba(255, 255, 255, 0) 50%,
           transparent 80%
         );
         z-index: -1;
         content: "";
         inset: -1px;
       }
*/
"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react"
import Image, { type StaticImageData } from "next/image"
import clsx from "clsx"
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  type MotionStyle,
  type MotionValue,
  type Variants,
} from "motion/react"
import Balancer from "react-wrap-balancer"

import { cn } from "@/lib/utils"

// Types
type WrapperStyle = MotionStyle & {
  "--x": MotionValue<string>
  "--y": MotionValue<string>
}

interface CardProps {
  title: string
  description: string
  bgClass?: string
}

interface ImageSet {
  step1dark1?: StaticImageData | string
  step1dark2?: StaticImageData | string
  step1light1: StaticImageData | string
  step1light2: StaticImageData | string
  step2dark1?: StaticImageData | string
  step2dark2?: StaticImageData | string
  step2light1: StaticImageData | string
  step2light2: StaticImageData | string
  step3dark?: StaticImageData | string
  step3light: StaticImageData | string
  step4light?: StaticImageData | string
  alt: string
}

interface FeatureCarouselProps extends CardProps {
  step1img1Class?: string
  step1img2Class?: string
  step2img1Class?: string
  step2img2Class?: string
  step3imgClass?: string
  step4imgClass?: string
  image: ImageSet
  stepsData?: readonly Step[]
}

interface StepImageProps {
  src: StaticImageData | string
  alt: string
  className?: string
  style?: React.CSSProperties
  width?: number
  height?: number
}

export interface Step {
  id: string
  name: string
  title: string
  description: string
}

// Default DinSide 3-Step Setup Data
const defaultSteps: readonly Step[] = [
  {
    id: "1",
    name: "Bước 1",
    title: "Mở trang tiện ích trên Chrome Web Store",
    description: "Bấm nút \"Thêm vào Chrome ngay\" ở trên hoặc truy cập trực tiếp trang DinSide trên Chrome Web Store.",
  },
  {
    id: "2",
    name: "Bước 2",
    title: "Bấm \"Thêm vào Chrome\"",
    description: "Xác nhận hộp thoại popup của trình duyệt. Tiện ích sẽ được cài đặt và kích hoạt trong vòng vài giây.",
  },
  {
    id: "3",
    name: "Bước 3",
    title: "Mở Side Panel và trải nghiệm",
    description: "Ghim biểu tượng DinSide vào thanh công cụ hoặc nhấn tổ hợp phím tắt để bắt đầu trò chuyện với AI cùng ngữ cảnh trang web.",
  },
] as const

const ANIMATION_PRESETS = {
  fadeInScale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
      mass: 0.5,
    },
  },
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
      mass: 0.5,
    },
  },
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
      mass: 0.5,
    },
  },
} as const

type AnimationPreset = keyof typeof ANIMATION_PRESETS

interface AnimatedStepImageProps extends StepImageProps {
  preset?: AnimationPreset
  delay?: number
  onAnimationComplete?: () => void
}

function useNumberCycler(
  totalSteps: number = 3,
  interval: number = 4000
) {
  const [currentNumber, setCurrentNumber] = useState(0)
  const [isManualInteraction, setIsManualInteraction] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const setupTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      setCurrentNumber((prev) => (prev + 1) % totalSteps)
      setIsManualInteraction(false)
      setupTimer()
    }, interval)
  }, [interval, totalSteps])

  const increment = useCallback(() => {
    setIsManualInteraction(true)
    setCurrentNumber((prev) => (prev + 1) % totalSteps)
    setupTimer()
  }, [totalSteps, setupTimer])

  const setStep = useCallback((idx: number) => {
    setIsManualInteraction(true)
    setCurrentNumber(idx % totalSteps)
    setupTimer()
  }, [totalSteps, setupTimer])

  useEffect(() => {
    setupTimer()
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [setupTimer])

  return {
    currentNumber,
    increment,
    setStep,
    isManualInteraction,
  }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const userAgent = navigator.userAgent
    const isSmall = window.matchMedia("(max-width: 768px)").matches
    const isMobileDevice = Boolean(
      /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.exec(
        userAgent
      )
    )
    setIsMobile(isSmall || isMobileDevice)
  }, [])

  return isMobile
}

function IconCheck({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      className={cn("h-4 w-4", className)}
      {...props}
    >
      <path d="m229.66 77.66-128 128a8 8 0 0 1-11.32 0l-56-56a8 8 0 0 1 11.32-11.32L96 188.69 218.34 66.34a8 8 0 0 1 11.32 11.32Z" />
    </svg>
  )
}

const stepVariants: Variants = {
  inactive: {
    scale: 0.9,
    opacity: 0.6,
  },
  active: {
    scale: 1,
    opacity: 1,
  },
}

const StepImage = forwardRef<
  HTMLImageElement,
  StepImageProps & { [key: string]: any }
>(
  (
    { src, alt, className, style, width = 1200, height = 630, ...props },
    ref
  ) => {
    return (
      <Image
        ref={ref}
        alt={alt}
        className={className}
        src={src}
        width={width}
        height={height}
        style={{
          position: "absolute",
          userSelect: "none",
          maxWidth: "unset",
          ...style,
        }}
        {...props}
      />
    )
  }
)
StepImage.displayName = "StepImage"

const MotionStepImage = motion(StepImage)

const AnimatedStepImage = ({
  preset = "fadeInScale",
  delay = 0,
  onAnimationComplete,
  ...props
}: AnimatedStepImageProps) => {
  const presetConfig = ANIMATION_PRESETS[preset]
  return (
    <MotionStepImage
      {...props}
      {...presetConfig}
      transition={{
        ...presetConfig.transition,
        delay,
      }}
      onAnimationComplete={onAnimationComplete}
    />
  )
}

function FeatureCard({
  bgClass,
  children,
  step,
  steps,
}: CardProps & {
  children: React.ReactNode
  step: number
  steps: readonly Step[]
}) {
  const [mounted, setMounted] = useState(false)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const isMobile = useIsMobile()

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    if (isMobile) return
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <motion.div
      className="animated-cards relative w-full rounded-[24px]"
      onMouseMove={handleMouseMove}
      style={
        {
          "--x": useMotionTemplate`${mouseX}px`,
          "--y": useMotionTemplate`${mouseY}px`,
        } as WrapperStyle
      }
    >
      <div
        className={clsx(
          "group relative w-full overflow-hidden rounded-[24px] border border-black/10 bg-gradient-to-b from-neutral-900/90 to-stone-900 transition duration-300 dark:border-white/10 dark:from-neutral-950/95 dark:to-neutral-900/95",
          "md:hover:border-transparent",
          bgClass
        )}
      >
        <div className="relative m-6 min-h-[460px] w-full md:m-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="flex w-full flex-col gap-3 md:w-3/5"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{
                duration: 0.3,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              <motion.h2
                className="text-xl font-bold tracking-tight text-white md:text-2xl"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.05,
                  duration: 0.3,
                  ease: [0.23, 1, 0.32, 1],
                }}
              >
                {steps[step].title}
              </motion.h2>
              <motion.div
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.1,
                  duration: 0.3,
                  ease: [0.23, 1, 0.32, 1],
                }}
              >
                <p className="text-sm leading-6 text-neutral-300 sm:text-base dark:text-zinc-400">
                  <Balancer>{steps[step].description}</Balancer>
                </p>
              </motion.div>
            </motion.div>
          </AnimatePresence>
          {mounted ? children : null}
        </div>
      </div>
    </motion.div>
  )
}

function Steps({
  steps,
  current,
  onChange,
}: {
  steps: readonly Step[]
  current: number
  onChange: (index: number) => void
}) {
  return (
    <nav aria-label="Progress" className="flex justify-end px-4">
      <ol
        className="flex w-full flex-wrap items-center justify-start gap-2 sm:justify-end md:gap-3"
        role="list"
      >
        {steps.map((step, stepIdx) => {
          const isCompleted = current > stepIdx
          const isCurrent = current === stepIdx

          return (
            <motion.li
              key={`${step.name}-${stepIdx}`}
              initial="inactive"
              animate={isCurrent ? "active" : "inactive"}
              variants={stepVariants}
              transition={{ duration: 0.3 }}
              className={cn(
                "relative z-50 rounded-full px-3.5 py-1.5 transition-all duration-300 ease-in-out cursor-pointer",
                isCurrent
                  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                  : isCompleted
                  ? "bg-neutral-800/80 border border-neutral-700/50 text-neutral-300"
                  : "bg-neutral-900/50 border border-neutral-800/40 text-neutral-500"
              )}
              onClick={() => onChange(stepIdx)}
            >
              <div className="flex items-center gap-2 text-xs md:text-sm font-medium">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isCompleted && "bg-emerald-500 text-black",
                    isCurrent && "bg-emerald-400 text-black",
                    !isCurrent && !isCompleted && "bg-neutral-700 text-neutral-400"
                  )}
                >
                  {isCompleted ? (
                    <IconCheck className="h-3 w-3 stroke-[3]" />
                  ) : (
                    stepIdx + 1
                  )}
                </span>
                <span>{step.name}</span>
              </div>
            </motion.li>
          )
        })}
      </ol>
    </nav>
  )
}

export function FeatureCarousel({
  image,
  stepsData = defaultSteps,
  step1img1Class,
  step1img2Class,
  step2img1Class,
  step2img2Class,
  step3imgClass,
  ...props
}: FeatureCarouselProps) {
  const { currentNumber: step, increment, setStep } = useNumberCycler(stepsData.length, 4500)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleIncrement = () => {
    if (isAnimating) return
    setIsAnimating(true)
    increment()
  }

  const handleAnimationComplete = () => {
    setIsAnimating(false)
  }

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <motion.div
            className="relative mt-8 h-[360px] w-full"
            onAnimationComplete={handleAnimationComplete}
          >
            <AnimatedStepImage
              alt={image.alt}
              className={clsx(step1img1Class)}
              src={image.step1light1}
              preset="slideInLeft"
            />
            <AnimatedStepImage
              alt={image.alt}
              className={clsx(step1img2Class)}
              src={image.step1light2}
              preset="slideInRight"
              delay={0.1}
            />
          </motion.div>
        )
      case 1:
        return (
          <motion.div
            className="relative mt-8 h-[360px] w-full"
            onAnimationComplete={handleAnimationComplete}
          >
            <AnimatedStepImage
              alt={image.alt}
              className={clsx(step2img1Class)}
              src={image.step2light1}
              preset="fadeInScale"
            />
            <AnimatedStepImage
              alt={image.alt}
              className={clsx(step2img2Class)}
              src={image.step2light2}
              preset="fadeInScale"
              delay={0.1}
            />
          </motion.div>
        )
      case 2:
      default:
        return (
          <motion.div
            className="relative mt-8 h-[360px] w-full"
            onAnimationComplete={handleAnimationComplete}
          >
            <AnimatedStepImage
              alt={image.alt}
              className={clsx(step3imgClass)}
              src={image.step3light}
              preset="fadeInScale"
            />
          </motion.div>
        )
    }
  }

  return (
    <FeatureCard {...props} step={step} steps={stepsData}>
      <div className="absolute top-0 right-0 z-50 p-4">
        <Steps current={step} onChange={setStep} steps={stepsData} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          {...ANIMATION_PRESETS.fadeInScale}
          className="relative h-full w-full"
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>
      <div
        className="absolute inset-0 z-20 cursor-pointer"
        onClick={handleIncrement}
      />
    </FeatureCard>
  )
}

export default FeatureCarousel
