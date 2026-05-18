import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  AjustesVotacion,
  isPastClosing,
  parseClosingDateTime,
} from '../lib/votingSettings';

const POLL_MS = 15_000;

async function syncVotingState(): Promise<AjustesVotacion | null> {
  const { error: rpcError } = await supabase.rpc('close_voting_if_expired');
  if (rpcError) console.warn('close_voting_if_expired:', rpcError.message);

  let { data, error } = await supabase
    .from('ajustes')
    .select('id, voting_enabled, closing_date, closing_time, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    const fallback = await supabase
      .from('settings')
      .select('id, voting_enabled, updated_at')
      .limit(1)
      .maybeSingle();

    if (fallback.error) {
      console.error('Error al cargar ajustes:', error);
      return null;
    }

    data = fallback.data
      ? {
          ...fallback.data,
          closing_date: '2026-05-20',
          closing_time: '18:00:00',
        }
      : null;
  }

  return data as AjustesVotacion | null;
}

export function useVotingSettings() {
  const [ajustes, setAjustes] = useState<AjustesVotacion | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const data = await syncVotingState();
    setAjustes(data);
    setLoading(false);
    return data;
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const data = await syncVotingState();
      if (active) {
        setAjustes(data);
        setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel('ajustes-votacion')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ajustes' },
        (payload) => {
          setAjustes(payload.new as AjustesVotacion);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      if (active) load();
    }, POLL_MS);

    return () => {
      active = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const closingAt = useMemo(
    () => parseClosingDateTime(ajustes?.closing_date, ajustes?.closing_time),
    [ajustes?.closing_date, ajustes?.closing_time]
  );

  const votingEnabled = useMemo(() => {
    if (!ajustes) return true;
    if (!ajustes.voting_enabled) return false;
    if (isPastClosing(closingAt)) return false;
    return true;
  }, [ajustes, closingAt]);

  return {
    ajustes,
    votingEnabled,
    closingAt,
    closingDate: ajustes?.closing_date ?? null,
    closingTime: ajustes?.closing_time ?? null,
    loading,
    refetch,
  };
}
