package types

import (
	errorsmod "cosmossdk.io/errors"
)

var (
	ErrInvalidArticleNumber = errorsmod.Register(ModuleName, 1, "invalid article number")
	ErrArticleNotFound      = errorsmod.Register(ModuleName, 2, "article not found")
	ErrLawFrozen            = errorsmod.Register(ModuleName, 3, "core law is frozen")
	ErrNotJusticeCourt      = errorsmod.Register(ModuleName, 4, "only justice court can freeze law")
	ErrInvalidNetworkFee    = errorsmod.Register(ModuleName, 5, "invalid network fee")
	ErrInvalidTaxRate       = errorsmod.Register(ModuleName, 6, "invalid tax rate")
)
