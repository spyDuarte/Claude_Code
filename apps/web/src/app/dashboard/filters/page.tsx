'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { filtersApi } from '@/lib/api';
import { UserFilterSchema, AutoReplyMode, ShiftType } from '@plantao-radar/shared';
import type { UserFilter } from '@plantao-radar/shared';

type FilterForm = UserFilter;

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  [ShiftType.DIURNO]: 'Diurno',
  [ShiftType.NOTURNO]: 'Noturno',
  [ShiftType.DIARISTA]: 'Diarista',
  [ShiftType.SOBREAVISO]: 'Sobreaviso',
  [ShiftType.PLANTAO_12H]: 'Plantão 12h',
  [ShiftType.PLANTAO_24H]: 'Plantão 24h',
};

export default function FiltersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FilterForm>({
    resolver: zodResolver(UserFilterSchema),
    defaultValues: {
      specialty: '',
      cities: [],
      hospitals: [],
      acceptedShifts: [],
      requiredKeywords: [],
      blockedKeywords: [],
      autoReplyMode: AutoReplyMode.DISABLED,
      autoReplyThreshold: 0.85,
      semiAutoThreshold: 0.6,
    },
  });

  useEffect(() => {
    const load = async () => {
      try {
        const filter = await filtersApi.get();
        if (filter) {
          reset({
            ...filter,
            cities: filter.cities ?? [],
            hospitals: filter.hospitals ?? [],
            acceptedShifts: (filter.acceptedShifts ?? []) as ShiftType[],
            requiredKeywords: filter.requiredKeywords ?? [],
            blockedKeywords: filter.blockedKeywords ?? [],
          });
        }
      } catch {
        // No filter yet
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reset]);

  const onSubmit = async (data: FilterForm) => {
    setSaving(true);
    try {
      await filtersApi.upsert(data);
      toast.success('Filtros salvos com sucesso!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar filtros');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Filtros</h1>
        <p className="text-gray-500 text-sm mt-1">Configure seus critérios de compatibilidade</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Perfil Médico</h2>

          <div>
            <label className="label">Especialidade *</label>
            <input
              {...register('specialty')}
              className="input"
              placeholder="Ex: Clínica Médica"
            />
            {errors.specialty && (
              <p className="text-red-500 text-xs mt-1">{errors.specialty.message}</p>
            )}
          </div>

          <div>
            <label className="label">Cidades aceitas (uma por linha)</label>
            <Controller
              name="cities"
              control={control}
              render={({ field }) => (
                <textarea
                  className="input min-h-20 resize-none"
                  placeholder="São Paulo&#10;Guarulhos&#10;Campinas"
                  value={field.value?.join('\n') ?? ''}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                />
              )}
            />
          </div>

          <div>
            <label className="label">Hospitais preferidos (um por linha)</label>
            <Controller
              name="hospitals"
              control={control}
              render={({ field }) => (
                <textarea
                  className="input min-h-20 resize-none"
                  placeholder="Hospital das Clínicas&#10;Einstein"
                  value={field.value?.join('\n') ?? ''}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                />
              )}
            />
          </div>
        </div>

        {/* Value & Distance */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Critérios de Valor</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Valor mínimo (R$)</label>
              <input
                {...register('minValue', { valueAsNumber: true })}
                type="number"
                className="input"
                placeholder="1500"
              />
            </div>
            <div>
              <label className="label">Distância máxima (km)</label>
              <input
                {...register('maxDistanceKm', { valueAsNumber: true })}
                type="number"
                className="input"
                placeholder="50"
              />
            </div>
          </div>
        </div>

        {/* Shift Types */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">Tipos de Plantão</h2>
          <Controller
            name="acceptedShifts"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(SHIFT_TYPE_LABELS).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600"
                      checked={field.value?.includes(value as ShiftType) ?? false}
                      onChange={(e) => {
                        const current = field.value ?? [];
                        if (e.target.checked) {
                          field.onChange([...current, value as ShiftType]);
                        } else {
                          field.onChange(current.filter((v) => v !== value));
                        }
                      }}
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            )}
          />
        </div>

        {/* Keywords */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Palavras-chave</h2>
          <div>
            <label className="label">Palavras obrigatórias (uma por linha)</label>
            <Controller
              name="requiredKeywords"
              control={control}
              render={({ field }) => (
                <textarea
                  className="input min-h-16 resize-none"
                  placeholder="clínico&#10;urgência"
                  value={field.value?.join('\n') ?? ''}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                />
              )}
            />
          </div>
          <div>
            <label className="label">Palavras bloqueadas (uma por linha)</label>
            <Controller
              name="blockedKeywords"
              control={control}
              render={({ field }) => (
                <textarea
                  className="input min-h-16 resize-none"
                  placeholder="pediatria&#10;ortopedia"
                  value={field.value?.join('\n') ?? ''}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                />
              )}
            />
          </div>
        </div>

        {/* Auto-reply */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Resposta Automática</h2>

          <div>
            <label className="label">Modo de resposta</label>
            <select {...register('autoReplyMode')} className="input">
              <option value={AutoReplyMode.DISABLED}>Desativado</option>
              <option value={AutoReplyMode.SEMI_AUTO}>Semi-automático (aguarda aprovação)</option>
              <option value={AutoReplyMode.FULL_AUTO}>Automático completo</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Limiar de auto-envio (0-1)</label>
              <input
                {...register('autoReplyThreshold', { valueAsNumber: true })}
                type="number"
                step="0.05"
                min="0"
                max="1"
                className="input"
              />
            </div>
            <div>
              <label className="label">Limiar de revisão (0-1)</label>
              <input
                {...register('semiAutoThreshold', { valueAsNumber: true })}
                type="number"
                step="0.05"
                min="0"
                max="1"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Template de resposta</label>
            <textarea
              {...register('replyTemplate')}
              className="input min-h-24 resize-none"
              placeholder="Olá! Tenho interesse no plantão. Pode me passar mais detalhes?"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Filtros'}
          </button>
        </div>
      </form>
    </div>
  );
}
