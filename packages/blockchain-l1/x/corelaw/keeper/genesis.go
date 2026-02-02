package keeper

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	"altan/x/corelaw/types"
)

// InitGenesis initializes the module's state from genesis
func (k Keeper) InitGenesis(ctx sdk.Context, data types.GenesisState) {
	// Set parameters
	k.SetParams(ctx, data.Params)
	
	// Load all 37 articles
	articles := types.DefaultGenesisArticles()
	for _, article := range articles {
		k.SetArticle(ctx, article)
	}
}

// ExportGenesis exports the module's state to genesis
func (k Keeper) ExportGenesis(ctx sdk.Context) *types.GenesisState {
	return &types.GenesisState{
		Params:   k.GetParams(ctx),
		Articles: k.GetAllArticles(ctx),
	}
}
