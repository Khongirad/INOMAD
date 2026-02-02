package types

import (
	"fmt"
)

// GenesisState defines the corelaw module's genesis state.
type GenesisState struct {
	Params   Params    `json:"params"`
	Articles []Article `json:"articles"`
}

// DefaultGenesis returns the default genesis state
func DefaultGenesis() *GenesisState {
	return &GenesisState{
		Params:   DefaultParams(),
		Articles: DefaultGenesisArticles(),
	}
}

// Validate performs basic genesis state validation returning an error upon any failure.
func (gs GenesisState) Validate() error {
	if len(gs.Articles) != 37 {
		return fmt.Errorf("expected 37 articles, got %d", len(gs.Articles))
	}
	return gs.Params.Validate()
}

// Article represents a constitutional article
type Article struct {
	Number     uint32 `json:"number"`
	Title      string `json:"title"`
	Category   string `json:"category"`
	Text       string `json:"text"`
	EnactedAt  string `json:"enacted_at"`
}
