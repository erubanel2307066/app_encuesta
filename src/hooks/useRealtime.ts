import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useRealtimeStats = () => {
  const [stats, setStats] = useState({
    totalVotes: 0,
    votesByCategory: [] as any[],
    recentActivity: [] as any[],
    winners: [] as any[],
    votingEnabled: true
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      // 1. Total Votes
      const { count: totalVotes } = await supabase
        .from('teacher_votes')
        .select('*', { count: 'exact', head: true });

      // 2. Votes by Category
      const { data: categoryStats } = await supabase
        .rpc('get_votes_by_category'); // Assuming we have or will create this RPC

      // Fallback if RPC doesn't exist: manual aggregation from teacher_votes
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

      // 3. Recent Activity
      const { data: recentActivity } = await supabase
        .from('teacher_votes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // 4. Winners (from view)
      const { data: winners } = await supabase
        .from('category_winners')
        .select('*');

      // 5. Voting Enabled Setting
      const { data: settings } = await supabase
        .from('settings')
        .select('voting_enabled')
        .single();

      setStats({
        totalVotes: totalVotes || 0,
        votesByCategory,
        recentActivity: recentActivity || [],
        winners: winners || [],
        votingEnabled: settings?.voting_enabled ?? true
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Subscribe to changes
    const channel = supabase
      .channel('admin-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teacher_votes' },
        () => fetchStats()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'settings' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
};
