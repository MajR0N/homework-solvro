from rest_framework.pagination import PageNumberPagination


class Pagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"  # ?page_size=50
    max_page_size = 100  # górny limit, żeby nikt nie poprosił o całą bazę naraz
