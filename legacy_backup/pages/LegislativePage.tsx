import React, { useState } from 'react';
import { Container } from '@mui/material';
import ProposalList from '../components/legislative/ProposalList';
import CreateProposal from '../components/legislative/CreateProposal';
import { KhuralLevel } from '../hooks/useVotingCenter';

/**
 * @page LegislativePage
 * @description Main page for Legislative Branch voting
 * 
 * Usage:
 * - View all proposals by level
 * - Create new proposals
 * - Vote on active proposals
 * - Finalize completed proposals
 */
export const LegislativePage: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // TODO: Get from connected wallet
  const userAddress = '0x...';
  const privateKey = '0x...'; // Should come from wallet, not hardcoded

  const handleVote = async (proposalId: number, support: boolean) => {
    console.log(`Voting on proposal ${proposalId}:`, support);
    // Vote logic handled by VotingCard via useVotingCenter hook
  };

  const handleFinalize = async (proposalId: number) => {
    console.log(`Finalizing proposal ${proposalId}`);
    // Finalize logic
  };

  return (
    <Container maxWidth="lg">
      <ProposalList
        userAddress={userAddress}
        onCreateClick={() => setCreateDialogOpen(true)}
        onVote={handleVote}
        onFinalize={handleFinalize}
      />

      <CreateProposal
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        defaultLevel={KhuralLevel.ARBAD}
        defaultKhuralId={1}
        privateKey={privateKey}
      />
    </Container>
  );
};

export default LegislativePage;
