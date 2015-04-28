{% macro functionSyntax(method) -%}
{$ method.name $}(
{%- for param in method.params -%}
	{$ param.name $}{% if not loop.last %}, {% endif %}
{%- endfor -%}
)
{%- endmacro -%}
# Service `{$ doc.name $}`

Lives in module {$ doc.moduleDoc.id | link $}.

{$ doc.description $}


{% for method in doc.methods -%}
### Method `{$ doc.name $}.{$ functionSyntax(method) $}`

{$ method.description $}

{% for param in method.params -%}
##### Argument `{$ param.name $}`

_{$ param.typeList | join('|') $}_ — {$ param.description $}

{% endfor %}
{%- if method.returns -%}
##### Returns

_{$ method.returns.typeList | join('|') $}_ — {$ method.returns.description $}
{% endif %}

{%- endfor %}
