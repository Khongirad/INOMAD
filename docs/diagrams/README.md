# iNomad KHURAL - Mermaid Diagrams

This folder contains Mermaid diagrams documenting the architecture, governance, and technical design of the iNomad KHURAL system.

## How to View

These `.mmd` files can be viewed:
- In **VS Code** with the Mermaid extension
- On **GitHub** (renders automatically)
- In **Mermaid Live Editor**: https://mermaid.live
- In any Markdown viewer that supports Mermaid

---

## Diagram Index

### State & Governance Structure

| File | Description |
|------|-------------|
| `01-state-structure-full-en.mmd` | Complete state structure with all branches (English) |
| `11-state-structure-full-ru.mmd` | Complete state structure with all branches (Russian) |
| `20-governance-levels.mmd` | Four-level governance: People → Branches → Institutions → Economy |

### Organizational Units (Arbad System)

| File | Description |
|------|-------------|
| `14-tumed-myangad-structure.mmd` | Tumed (10,000) → Myangad (1,000) structure |
| `16-myangad-zuud-structure.mmd` | Myangad (1,000) → Zuud (100) structure |
| `19-zuud-structure.mmd` | Zuud leader with managers and Arbad leaders (detailed) |
| `18-arbad-structure.mmd` | Arbad (10) unit: leader, 9 members, and families |

### Banking & Finance

| File | Description |
|------|-------------|
| `12-banking-architecture.mmd` | Banking architecture: Central Bank → National Banks → Wallets |
| `13-central-bank-network.mmd` | Central Bank with 9 National Banks network |
| `15-central-bank-network-alt.mmd` | Alternative Central Bank network view |

### Smart Contracts & Transparency

| File | Description |
|------|-------------|
| `21-transparency-layers.mmd` | Two-layer transparency: public state vs encrypted civil layer |
| `22-judicial-access-sequence.mmd` | Sequence diagram: judicial order for encrypted data access |
| `23-smart-contract-classes.mmd` | Class diagram: SeatSBT, DigitalSeal, GovContract, ACL |
| `24-gov-contract-states.mmd` | State diagram: government contract lifecycle |
| `25-audit-validation-flow.mmd` | Audit and validation flow with auto-flagging |

### Guilds & Economy

| File | Description |
|------|-------------|
| `05-marketplace-registry.mmd` | Marketplace registry: National Bank → Markets → Payments |
| `06-escrow-contract.mmd` | Escrow contract: Party A, Party B, Mediator, Notary |
| `07-media-guild-funding.mmd` | Media guild funding model with voting and payments |
| `08-guild-creative-economy.mmd` | Creative economy: creators, guilds, smart contracts |
| `09-company-guild-registration.mmd` | One-window registration for companies and guilds |

### Quests & Tasks

| File | Description |
|------|-------------|
| `04-quest-workflow.mmd` | Full quest workflow: create → execute → pay → archive |
| `10-quest-smart-contract.mmd` | Quest smart contract flow with escrow and payout |

### Project & Team

| File | Description |
|------|-------------|
| `02-system-design-v-model.mmd` | V-model: System Design → Technical Management → Realization |
| `03-team-structure.mmd` | Development team structure: roles and dependencies |
| `26-project-lifecycle-timeline.mmd` | Project lifecycle: Concept → Design → Develop → Prod → Ops |
| `27-phased-development.mmd` | Phased development: Pre-A through Phase F |

### Duplicates / Alternatives

| File | Description |
|------|-------------|
| `15-central-bank-network-alt.mmd` | Same as `13-central-bank-network.mmd` |
| `17-myangad-zuud-structure-alt.mmd` | Same as `16-myangad-zuud-structure.mmd` |

---

## Quick Stats

- **Total diagrams**: 27
- **Languages**: English, Russian
- **Diagram types**: flowchart, sequenceDiagram, classDiagram, stateDiagram, graph
