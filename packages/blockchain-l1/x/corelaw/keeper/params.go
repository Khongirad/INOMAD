package keeper

import (
	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	
	"altan/x/corelaw/types"
)

// GetParams returns the current parameters
func (k Keeper) GetParams(ctx sdk.Context) types.Params {
	store := ctx.KVStore(k.storeKey)
	bz := store.Get(ParamsKey)
	if bz == nil {
		return types.DefaultParams()
	}
	
	var params types.Params
	k.cdc.MustUnmarshal(bz, &params)
	return params
}

// SetParams sets the parameters
func (k Keeper) SetParams(ctx sdk.Context, params types.Params) {
	store := ctx.KVStore(k.storeKey)
	bz := k.cdc.MustMarshal(&params)
	store.Set(ParamsKey, bz)
}

// CalculateNetworkFee calculates the network fee for a given amount
// Returns both the calculated fee and the capped fee
func (k Keeper) CalculateNetworkFee(ctx sdk.Context, amount math.Int) (fee math.Int, cappedFee math.Int) {
	params := k.GetParams(ctx)
	
	// Calculate 0.03% fee
	// fee = amount * (network_fee_bps / 10000)
	// For 3 bps: fee = amount * 3 / 10000 = amount * 0.0003
	fee = amount.Mul(math.NewInt(int64(params.NetworkFeeBps))).Quo(math.NewInt(10000))
	
	// Apply cap (1000 ALTAN = 1,000,000,000 ualtan)
	cap, ok := math.NewIntFromString(params.NetworkFeeCap)
	if !ok {
		// Default cap: 1000 ALTAN
		cap = math.NewInt(1_000_000_000)
	}
	
	cappedFee = fee
	if fee.GT(cap) {
		cappedFee = cap
	}
	
	return fee, cappedFee
}

// GetNetworkFeeBPS returns the network fee in basis points
func (k Keeper) GetNetworkFeeBPS(ctx sdk.Context) uint32 {
	params := k.GetParams(ctx)
	return params.NetworkFeeBps
}

// GetTaxRateBPS returns the annual tax rate in basis points
func (k Keeper) GetTaxRateBPS(ctx sdk.Context) uint32 {
	params := k.GetParams(ctx)
	return params.TaxRateBps
}
