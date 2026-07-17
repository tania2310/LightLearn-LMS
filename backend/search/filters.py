from django.db.models import Q

def apply_filters_orm(queryset, params):
    # Category
    category = params.get("category")
    if category:
        queryset = queryset.filter(category__iexact=category)

    # Level
    level = params.get("level")
    if level:
        queryset = queryset.filter(level__iexact=level)

    # Language
    language = params.get("language")
    if language:
        queryset = queryset.filter(language__iexact=language)

    # Price range
    min_price = params.get("min_price")
    if min_price:
        try:
            queryset = queryset.filter(price__gte=float(min_price))
        except ValueError:
            pass
    max_price = params.get("max_price")
    if max_price:
        try:
            queryset = queryset.filter(price__lte=float(max_price))
        except ValueError:
            pass

    # Duration range
    max_duration = params.get("max_duration")
    if max_duration:
        try:
            queryset = queryset.filter(duration__lte=int(max_duration))
        except ValueError:
            pass

    # Rating range
    min_rating = params.get("min_rating")
    if min_rating:
        try:
            queryset = queryset.filter(average_rating__gte=float(min_rating))
        except ValueError:
            pass

    # Mentor
    mentor = params.get("mentor")
    if mentor:
        queryset = queryset.filter(mentor__username__iexact=mentor)

    # Tags
    tags = params.get("tags")
    if tags:
        queryset = queryset.filter(tags__icontains=tags)

    return queryset


def apply_filters_es(search_obj, params):
    # Category
    category = params.get("category")
    if category:
        search_obj = search_obj.filter("term", category=category)

    # Level
    level = params.get("level")
    if level:
        search_obj = search_obj.filter("term", level=level)

    # Language
    language = params.get("language")
    if language:
        search_obj = search_obj.filter("term", language=language)

    # Price range
    min_price = params.get("min_price")
    max_price = params.get("max_price")
    if min_price or max_price:
        price_range = {}
        if min_price:
            try:
                price_range["gte"] = float(min_price)
            except ValueError:
                pass
        if max_price:
            try:
                price_range["lte"] = float(max_price)
            except ValueError:
                pass
        if price_range:
            search_obj = search_obj.filter("range", price=price_range)

    # Duration range
    max_duration = params.get("max_duration")
    if max_duration:
        try:
            search_obj = search_obj.filter("range", duration={"lte": int(max_duration)})
        except ValueError:
            pass

    # Rating range
    min_rating = params.get("min_rating")
    if min_rating:
        try:
            search_obj = search_obj.filter("range", average_rating={"gte": float(min_rating)})
        except ValueError:
            pass

    # Mentor
    mentor = params.get("mentor")
    if mentor:
        search_obj = search_obj.filter("term", mentor_name=mentor)

    # Tags
    tags = params.get("tags")
    if tags:
        search_obj = search_obj.query("match", tags=tags)

    return search_obj
