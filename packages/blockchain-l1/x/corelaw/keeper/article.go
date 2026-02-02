package keeper

import (
	"cosmossdk.io/store/prefix"
	sdk "github.com/cosmos/cosmos-sdk/types"
	
	"altan/x/corelaw/types"
)

// Store keys
var (
	ArticleKey    = []byte{0x01} // prefix for articles
	ParamsKey     = []byte{0x02} // prefix for params
	CoreLawStateKey = []byte{0x03} // prefix for state
)

// GetArticle retrieves an article by its number
func (k Keeper) GetArticle(ctx sdk.Context, articleNumber uint32) (types.Article, bool) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), ArticleKey)
	
	key := sdk.Uint64ToBigEndian(uint64(articleNumber))
	bz := store.Get(key)
	if bz == nil {
		return types.Article{}, false
	}
	
	var article types.Article
	k.cdc.MustUnmarshal(bz, &article)
	return article, true
}

// SetArticle stores an article
func (k Keeper) SetArticle(ctx sdk.Context, article types.Article) {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), ArticleKey)
	
	key := sdk.Uint64ToBigEndian(uint64(article.ArticleNumber))
	bz := k.cdc.MustMarshal(&article)
	store.Set(key, bz)
}

// GetAllArticles retrieves all articles
func (k Keeper) GetAllArticles(ctx sdk.Context) []types.Article {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), ArticleKey)
	
	iterator := store.Iterator(nil, nil)
	defer iterator.Close()
	
	articles := []types.Article{}
	for ; iterator.Valid(); iterator.Next() {
		var article types.Article
		k.cdc.MustUnmarshal(iterator.Value(), &article)
		articles = append(articles, article)
	}
	
	return articles
}

// GetArticlesByCategory retrieves articles filtered by category
func (k Keeper) GetArticlesByCategory(ctx sdk.Context, category types.ArticleCategory) []types.Article {
	allArticles := k.GetAllArticles(ctx)
	
	if category == types.ArticleCategory_ARTICLE_CATEGORY_UNSPECIFIED {
		return allArticles
	}
	
	filtered := []types.Article{}
	for _, article := range allArticles {
		if article.Category == category {
			filtered = append(filtered, article)
		}
	}
	
	return filtered
}
