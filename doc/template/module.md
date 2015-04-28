# Module `{$ doc.name $}`

{$ doc.description $}


{% if doc.dependencies.length -%}
## Dependencies

{% for depencency in doc.dependencies -%}
* {$ dependency $}
{% endfor -%}
{%- endif %}


{% for group in doc.componentGroups -%}

{% if group.components.length -%}
## {$ group.groupType|capitalize $} components

{% for component in group.components -%}
* [{$ component.name $}]({$ component.outputPath $})
{% endfor -%}
{%- endif %}

{%- endfor %}