// ValoraIA_front/src/components/IntakeStep.tsx

import { useState, useRef, useEffect } from 'react'
import type { ExtractionResult } from '../types'
import { extractProperty } from '../api'

const PRIMARY = '#1E3A8A'

interface Props {
  onExtracted: (result: ExtractionResult) => void
  onSkip: () => void
}

type RecordingState = 'idle' | 'recording' | 'processing'

export default function IntakeStep({ onExtracted, onSkip }: Props) {
  const [mode, setMode] = useState<'audio' | 'text'>('audio')
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [micDenied, setMicDenied] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mimeTypeRef = useRef<string>('audio/webm')

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      mediaRecorderRef.current?.stop()
    }
  }, [])

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const supportedMime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : ''
      mimeTypeRef.current = supportedMime || 'audio/webm'
      const options = supportedMime ? { mimeType: supportedMime } : {}
      const mr = new MediaRecorder(stream, options)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => stream.getTracks().forEach(t => t.stop())
      mr.start()
      mediaRecorderRef.current = mr
      setRecordingState('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      setMicDenied(true)
      setMode('text')
    }
  }

  const stopAndProcess = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    const mr = mediaRecorderRef.current
    if (!mr) return
    setRecordingState('processing')

    // Keep a reference to the stream to stop tracks after onstop fires
    const stream = mr.stream

    await new Promise<void>(resolve => {
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        resolve()
      }
      mr.stop()
    })

    const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current })
    try {
      const result = await extractProperty(blob)
      onExtracted(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar áudio. Tente o texto.')
      setRecordingState('idle')
    }
  }

  const submitText = async () => {
    if (!text.trim()) return
    setError(null)
    setRecordingState('processing')
    try {
      const result = await extractProperty(text.trim())
      onExtracted(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar descrição.')
      setRecordingState('idle')
    }
  }

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  if (recordingState === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-4">
        <div
          className="w-12 h-12 rounded-full border-[3px] border-slate-200 animate-spin"
          style={{ borderTopColor: PRIMARY }}
        />
        <p className="text-base font-semibold text-slate-900">Analisando descrição…</p>
        <p className="text-sm text-slate-500">A IA está extraindo os dados do imóvel</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Descreva o imóvel</h2>
        <p className="text-sm text-slate-500">
          Fale ou escreva sobre o imóvel. A IA preenche o formulário automaticamente.
        </p>
      </div>

      {micDenied && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
          Microfone não disponível. Use a descrição por escrito abaixo.
        </div>
      )}

      {!micDenied && (
        <div className="flex gap-2 mb-1">
          <button
            onClick={() => setMode('audio')}
            style={{
              padding: '6px 14px',
              borderRadius: 16,
              border: `1.5px solid ${mode === 'audio' ? PRIMARY : '#E2E8F0'}`,
              background: mode === 'audio' ? PRIMARY + '0D' : '#fff',
              color: mode === 'audio' ? PRIMARY : '#64748B',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Áudio
          </button>
          <button
            onClick={() => setMode('text')}
            style={{
              padding: '6px 14px',
              borderRadius: 16,
              border: `1.5px solid ${mode === 'text' ? PRIMARY : '#E2E8F0'}`,
              background: mode === 'text' ? PRIMARY + '0D' : '#fff',
              color: mode === 'text' ? PRIMARY : '#64748B',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Texto
          </button>
        </div>
      )}

      {mode === 'audio' && !micDenied ? (
        <div className="flex flex-col items-center gap-5 py-6">
          {recordingState === 'idle' ? (
            <button
              onClick={startRecording}
              aria-label="Iniciar gravação"
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                border: `3px solid ${PRIMARY}`,
                background: '#fff',
                color: PRIMARY,
                fontSize: 28,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              🎙
            </button>
          ) : (
            <button
              onClick={stopAndProcess}
              aria-label="Parar gravação"
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                border: 'none',
                background: '#EF4444',
                color: '#fff',
                fontSize: 24,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            >
              ⏹
            </button>
          )}

          {recordingState === 'recording' && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-mono font-bold" style={{ color: '#EF4444' }}>
                {fmt(seconds)}
              </span>
              <span className="text-xs text-slate-400">Gravando… clique para parar</span>
            </div>
          )}

          {recordingState === 'idle' && (
            <p className="text-sm text-slate-500 text-center">
              Clique para gravar a descrição do imóvel
            </p>
          )}

          <button
            onClick={() => setMode('text')}
            className="text-xs text-slate-400 underline"
            style={{ cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit' }}
          >
            ou descreva por escrito
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none bg-white resize-none"
            rows={5}
            placeholder="Ex: Apartamento de 3 quartos, 98m², no bairro Manaíra em João Pessoa. 2 banheiros, 1 vaga, condomínio com piscina e academia. Estado de conservação regular, construído há 8 anos."
            value={text}
            onChange={e => setText(e.target.value)}
            onFocus={e => e.currentTarget.style.borderColor = PRIMARY}
            onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            style={{ borderColor: '#e2e8f0' }}
          />
          <button
            onClick={submitText}
            disabled={!text.trim()}
            className="self-end px-5 py-2.5 rounded-lg border-none text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: PRIMARY, fontFamily: 'inherit' }}
          >
            Extrair dados
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
          <button
            onClick={onSkip}
            className="ml-2 underline"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }}
          >
            Pular e preencher manualmente
          </button>
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-400">Entrada por IA é opcional</span>
        <button
          onClick={onSkip}
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-500 text-sm font-medium"
          style={{ cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Pular
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.06); }
        }
      `}</style>
    </div>
  )
}

