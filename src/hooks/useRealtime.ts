import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { parseClosingDateTime } from '../lib/votingSettings';

export const useRealtimeStats = () => {
  const [stats, setStats] = useState({
    totalVotes: 0,
    votesByCategory: [] as any[],
    recentActivity: [] as any[],
    winners: [] as any[],
    votingEnabled: true,
    ajustesId: null as string | null,
    closingDate: null as string | null,
    closingTime: null as string | null,
    closingAt: null as Date | null,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const { error: rpcError } = await supabase.rpc('close_voting_if_expired');
      if (rpcError) console.warn('close_voting_if_expired:', rpcError.message);

      const { count: totalVotes } = await supabase
        .from('teacher_votes')
        .select('*', { count: 'exact', head: true });

      const { data: categoryStats } = await supabase.rpc('get_votes_by_category');

      let votesByCategory = [];
      if (!categoryStats) {
        const { data: allVotes } = await supabase.from('teacher_votes').select('category_id');
        const counts = (allVotes || []).reduce((acc: any, vote) => {
          acc[vote.category_id] = (acc[vote.category_id] || 0) + 1;
          return acc;
        }, {});
        votesByCategory = Object.entries(counts).map(([id, count]) => ({ id, count }));
      } else {
        votesByCategory = categoryStats;
      }

      const { data: recentActivity } = await supabase
        .from('teacher_votes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: winners } = await supabase.from('category_winners').select('*');

      const { data: ajustes } = await supabase
        .from('ajustes')
        .select('id, voting_enabled, closing_date, closing_time')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const closingAt = parseClosingDateTime(ajustes?.closing_date, ajustes?.closing_time);
      const enabled = ajustes?.voting_enabled ?? true;
      const pastDeadline = closingAt ? Date.now() >= closingAt.getTime() : false;

      setStats({
        totalVotes: totalVotes || 0,
        votesByCategory,
        recentActivity: recentActivity || [],
        winners: winners || [],
        votingEnabled: enabled && !pastDeadline,
        ajustesId: ajustes?.id ?? null,
        closingDate: ajustes?.closing_date ?? null,
        closingTime: ajustes?.closing_time ?? null,
        closingAt,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_votes' }, () => fetchStats())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ajustes' }, () => fetchStats())
      .subscribe();

    const interval = setInterval(fetchStats, 15_000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
};
