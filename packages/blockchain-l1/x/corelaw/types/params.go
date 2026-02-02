package types

import (
	"cosmossdk.io/math"
)

// Params defines the parameters for the corelaw module.
type Params struct {
	NetworkFeeBps uint32 `json:"network_fee_bps"` // 3 = 0.03%
	NetworkFeeCap string `json:"network_fee_cap"` // 1000 ALTAN
	TaxRateBps    uint32 `json:"tax_rate_bps"`    // 1000 = 10%
}

// DefaultParams returns default module parameters
func DefaultParams() Params {
	return Params{
		NetworkFeeBps: 3,                                     // 0.03%
		NetworkFeeCap: math.NewInt(1_000_000_000).String(), // 1000 ALTAN
		TaxRateBps:    1000,                                  // 10%
	}
}

// Validate validates params
func (p Params) Validate() error {
	// Network fee BPS should be reasonable (0-100 = 0-1%)
	if p.NetworkFeeBps > 100 {
		return ErrInvalidNetworkFee.Wrapf("network fee %d bps exceeds maximum 100 bps (1%%)", p.NetworkFeeBps)
	}
	
	// Tax rate should be reasonable (0-5000 = 0-50%)
	if p.TaxRateBps > 5000 {
		return ErrInvalidTaxRate.Wrapf("tax rate %d bps exceeds maximum 5000 bps (50%%)", p.TaxRateBps)
	}
	
	// Validate cap is a valid integer
	_, ok := math.NewIntFromString(p.NetworkFeeCap)
	if !ok {
		return ErrInvalidNetworkFee.Wrapf("invalid network fee cap: %s", p.NetworkFeeCap)
	}
	
	return nil
}
