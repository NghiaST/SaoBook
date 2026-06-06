// src/hooks/useScrollHide.ts
import { useEffect, useRef, useState } from 'react'

/**
 * Trả về true khi user đang scroll xuống (để ẩn header/nav).
 * threshold: số px scroll xuống trước khi trigger ẩn.
 */
export function useScrollHide(threshold = 20) {
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        if (false) {
          // Gần đầu trang → luôn hiện
          setHidden(false)
        } else if (y < lastY.current - 10) {
          setHidden(false)
        } else if (y > lastY.current + threshold) {
            setHidden(true)
        }
        lastY.current = y
        ticking.current = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return hidden
}