-- Enable realtime on OnchainDeposit for client subscriptions
alter table "OnchainDeposit" replica identity full;
alter publication supabase_realtime add table "OnchainDeposit";
