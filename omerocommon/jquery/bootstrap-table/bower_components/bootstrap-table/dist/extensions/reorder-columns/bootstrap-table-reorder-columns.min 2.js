/*
* bootstrap-table - v1.9.1 - 2015-10-25
* https://github.com/wenzhixin/bootstrap-table
* Copyright (c) 2015 zhixin wen
* Licensed MIT License
*/
!function(a){"use strict";a.extend(a.fn.bootstrapTable.defaults,{reorderableColumns:!1,maxMovingRows:10,onReorderColumn:function(){return!1},dragaccept:null}),a.extend(a.fn.bootstrapTable.Constructor.EVENTS,{"reorder-column.bs.table":"onReorderColumn"});var b=a.fn.bootstrapTable.Constructor,c=b.prototype.initHeader,d=b.prototype.toggleColumn,e=b.prototype.toggleView,f=b.prototype.resetView;b.prototype.initHeader=function(){c.apply(this,Array.prototype.slice.apply(arguments)),this.options.reorderableColumns&&this.makeRowsReorderable()},b.prototype.toggleColumn=function(){d.apply(this,Array.prototype.slice.apply(arguments)),this.options.reorderableColumns&&this.makeRowsReorderable()},b.prototype.toggleView=function(){e.apply(this,Array.prototype.slice.apply(arguments)),this.options.reorderableColumns&&(this.options.cardView||this.makeRowsReorderable())},b.prototype.resetView=function(){f.apply(this,Array.prototype.slice.apply(arguments)),this.options.reorderableColumns&&this.makeRowsReorderable()},b.prototype.makeRowsReorderable=function(){var b=this;try{a(this.$el).dragtable("destroy")}catch(c){}a(this.$el).dragtable({maxMovingRows:b.options.maxMovingRows,dragaccept:b.options.dragaccept,clickDelay:200,beforeStop:function(){var c=[],d=[],e=[],f=[],g=-1;if(b.$header.find("th").each(function(){c.push(a(this).data("field")),d.push(a(this).data("formatter"))}),c.length<b.columns.length){f=a.grep(b.columns,function(a){return!a.visible});for(var h=0;h<f.length;h++)c.push(f[h].field),d.push(f[h].formatter)}for(var h=0;h<c.length;h++)g=a.fn.bootstrapTable.utils.getFieldIndex(b.columns,c[h]),-1!==g&&(e.push(b.columns[g]),b.columns.splice(g,1));b.columns=b.columns.concat(e),b.header.fields=c,b.header.formatters=d,b.resetView(),b.trigger("reorder-column",c)}})}}(jQuery);