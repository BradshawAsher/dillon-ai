// Browser Web Audio API Synthesizer & Web Notification Utility
// Zero-dependency pure Web Audio sound generator for system alerts

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (AudioCtxClass) {
            audioCtx = new AudioCtxClass()
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => { /* user interaction required */ })
    }
    return audioCtx
}

export function playErrorAlertSound() {
    try {
        const ctx = getAudioContext()
        if (!ctx) return

        const now = ctx.currentTime

        // Oscillator 1: Low descending saw wave (Error Buzz)
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'sawtooth'
        osc1.frequency.setValueAtTime(220, now) // A3
        osc1.frequency.exponentialRampToValueAtTime(110, now + 0.35) // A2

        gain1.gain.setValueAtTime(0.3, now)
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

        osc1.connect(gain1)
        gain1.connect(ctx.destination)

        osc1.start(now)
        osc1.stop(now + 0.4)

        // Oscillator 2: Secondary dissonant pulse
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'square'
        osc2.frequency.setValueAtTime(155.56, now + 0.15) // D#3 (dissonant diminished 5th)
        osc2.frequency.exponentialRampToValueAtTime(80, now + 0.5)

        gain2.gain.setValueAtTime(0, now)
        gain2.gain.setValueAtTime(0.25, now + 0.15)
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55)

        osc2.connect(gain2)
        gain2.connect(ctx.destination)

        osc2.start(now + 0.15)
        osc2.stop(now + 0.55)
    } catch (e) {
        console.warn('Unable to play error audio alert:', e)
    }
}

export function sendBrowserNotification(title: string, body: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    try {
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' })
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                    new Notification(title, { body, icon: '/favicon.ico' })
                }
            }).catch(() => {})
        }
    } catch (e) {
        console.warn('Browser notification error:', e)
    }
}

export function triggerFailureAlert(title: string, message: string) {
    playErrorAlertSound()
    sendBrowserNotification(title, message)
}
