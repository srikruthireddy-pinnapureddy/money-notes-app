import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('User authentication failed:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Exporting data for user: ${user.id}`);

    // Collect all user data from various tables
    const exportData: Record<string, unknown> = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      phone: user.phone,
      created_at: user.created_at,
    };

    // Profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    exportData.profile = profile;

    // Personal transactions
    const { data: personalTransactions } = await supabase
      .from('personal_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    exportData.personal_transactions = personalTransactions || [];

    // Investments
    const { data: investments } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    exportData.investments = investments || [];

    // Investment transactions
    const { data: investmentTransactions } = await supabase
      .from('investment_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    exportData.investment_transactions = investmentTransactions || [];

    // Groups created by user
    const { data: createdGroups } = await supabase
      .from('groups')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
    exportData.groups_created = createdGroups || [];

    // Group memberships
    const { data: groupMemberships } = await supabase
      .from('group_members')
      .select('*, groups(name, description, currency)')
      .eq('user_id', user.id);
    exportData.group_memberships = groupMemberships || [];

    // Expenses paid by user
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*, groups(name)')
      .eq('paid_by', user.id)
      .order('created_at', { ascending: false });
    exportData.expenses_paid = expenses || [];

    // Expense splits for user
    const { data: expenseSplits } = await supabase
      .from('expense_splits')
      .select('*, expenses(description, amount, currency, expense_date)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    exportData.expense_splits = expenseSplits || [];

    // Settlements involving user
    const { data: settlementsFrom } = await supabase
      .from('settlements')
      .select('*, groups(name)')
      .eq('from_user', user.id)
      .order('created_at', { ascending: false });
    
    const { data: settlementsTo } = await supabase
      .from('settlements')
      .select('*, groups(name)')
      .eq('to_user', user.id)
      .order('created_at', { ascending: false });
    
    exportData.settlements = {
      paid: settlementsFrom || [],
      received: settlementsTo || [],
    };

    // Group messages sent by user
    const { data: messages } = await supabase
      .from('group_messages')
      .select('id, content, created_at, edited_at, group_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    exportData.messages_sent = messages || [];

    // Notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    exportData.notifications = notifications || [];

    // Push subscriptions (exclude sensitive keys)
    const { data: pushSubscriptions } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, created_at')
      .eq('user_id', user.id);
    exportData.push_subscriptions = pushSubscriptions || [];

    console.log('Data export completed successfully');

    // Return as downloadable JSON
    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="user-data-export-${new Date().toISOString().split('T')[0]}.json"`,
        },
      }
    );
  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to export data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});