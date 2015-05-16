{% macro functionSyntax(method) -%}
{$ method.name $}(
{%- for param in method.params -%}
	{$ param.name $}{% if not loop.last %}, {% endif %}
{%- endfor -%}
)
{%- endmacro -%}
{%- macro githubAnchor(method) -%}
#{$ method.name | lower | replace('.', '') $}
{%- for param in method.params -%}
	{$ param.name | lower $}{% if not loop.last %}-{% endif %}
{%- endfor -%}
{%- endmacro -%}
Module {$ doc.moduleDoc.id | link $} :boom:
# Service `{$ doc.name $}`

{$ doc.description $}

{% for method in doc.methods %}
* [`{$ method.name $}`]({$ githubAnchor(method) $})
{%- endfor %}

{% for method in doc.methods %}
## {$ functionSyntax(method) $}

:octocat: [`{$ method.fileInfo.projectRelativePath $}#L{$ method.startingLine $}`](https://github.com/nouncy/bangjs/tree/master/{$ method.fileInfo.projectRelativePath $}#L{$ method.startingLine $})

{$ method.description $}

{% for param in method.params -%}
:baby_bottle: **{$ param.name $}** _{$ param.typeList | join('|') $}_

{$ param.description $}

{% endfor %}
{%- if method.returns -%}
:dash: _{$ method.returns.typeList | join('|') $}_

{$ method.returns.description $}
{% endif %}

{%- endfor %}
