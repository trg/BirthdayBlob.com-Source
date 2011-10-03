MONTH_REGEX = /January|February|March|April|May|June|July|August|September|October|November|December/;
YEAR_REGEX = /\d{4}/;
DAY_REGEX = /\d{1,2}/;
MONTH_LIST = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];


// For browser that lack the indexOf method

if(!Array.indexOf){
  Array.prototype.indexOf = function(obj){
          for(var i=0; i<this.length; i++){
              if(this[i]==obj){
                  return i;
              }
          }
      return -1;
  }
}


Global = {

    is_connected: false,

    session: null,  // FB session data

    init: function() {
        
        // Subscribe to Facebook API Events

        FB.Event.subscribe('auth.login', function(response) {
            
            Global.session = response.session;
            Global.is_connected = true;
            Global.init_blob_page();
        
        });
        
        
        FB.Event.subscribe('auth.logout', function(response) {

            window.location = "/"; // Just refresh page when they log out     
      
        });

        // Initialize Facebook API + Begin Rendering if Logged In

        FB.init({appId: '200855896620685', status: true, cookie: true, xfbml: true});  

        FB.getLoginStatus(function(response) {

           if (response.session) {
               
                if( !Global.is_connected ) {
                    
                    Global.session = response.session;
                    Global.is_connected = true;
                    Global.init_blob_page();
                    
                }   
                        
           }
           
        });

        // jQuery Click Events; re: showing / hiding graph data
    
        $('.toggle-bar .show').click( function() {
            $(this).hide();
            $('.toggle-bar .hide').show();
            $('#chart-area').slideDown();
        });

        $('.toggle-bar .hide').click( function() {
            $(this).hide();
            $('.toggle-bar .show').show();
            $('#chart-area').slideUp();
        });

    },

    init_home_page: function() {
        // STUB - Use this for JS that should execute on the non-logged in home page
    },

    init_blob_page: function() {

        blob = Blob.init();

        blob.fetch_birthdays( function() {

            // Main Table of Birthdays
            Render.table( $( '#birthday-table') );

            // Main Chart by Month
            $('#bar-chart').html("<img src='" + Render.bar_chart_url() + "' />");
            
            // Stat Boxes
            $('#popular-year .stat').html( Render.most_common_year() );
            $('#friend-count .stat').html( blob.friends.length );
            
        });

        $('.logged-out').hide();
        $('.logged-in').show();
        
    }

};

function facebook_user( query_row ) {

    this.name = query_row['name'];
    this.raw_birthday = query_row['birthday']; // Eg: "April 1, 1970", direct from FB
    this.uid = query_row['uid'];

    // Normally I'd just use the Date() class, but since some bdays come back w/o a year,
    // we'd end up w/ InvalidDate objects.

    this.get_day = function() {
        var match = this.raw_birthday.match(DAY_REGEX);
        if (match) return match[0];
        return match;        
    }

    this.get_month = function() {
        var match = this.raw_birthday.match(MONTH_REGEX);
        if (match) return match[0];
        return match;       
    };

    this.get_year = function() {
        var match = this.raw_birthday.match(YEAR_REGEX);
        if (match) return match[0];
        return match;      
    }
}

Blob = {
    
    friends: [],

    ready: false, // when true, data has been fathered from FB

    init: function() {
        return this;
    },

    fetch_birthdays: function( cb ) {

        var query = FB.Data.query('SELECT uid, name, birthday FROM user WHERE uid IN (SELECT uid2 FROM friend WHERE uid1=me())');  // Thanks http://stackoverflow.com/users/337227/ifaour
        query.wait( function(rows) {         
            
            Blob.friends = [];

            for (var i=0; i<rows.length; i++) {

                var friend = rows[i];
                var bday = friend['birthday'];

                if (bday !== undefined && bday != null) {
                    Blob.friends.push( new facebook_user(friend) );
                }

            }           

            Blob.ready = true;

            cb();
 
        });
    },

    get_birthdays_in_month: function( month ) {
        var bdays = [];
        for (var i=0; i < Blob.friends.length; i++) {
            var friend = Blob.friends[i];
            if (friend.get_month() == month) {
                bdays.push( friend );
            }
        }        
        return bdays;
    }
    

};

Render = {

    table: function( $selector ) {

        $selector.html(''); // Clear it out

        var html = "";

        for (var month_index=0; month_index < MONTH_LIST.length; month_index++) {

            var month = MONTH_LIST[month_index];

            var bdays_in_month = Blob.get_birthdays_in_month( month );

            if (bdays_in_month.length > 0) {

                html += "<h3>" + month + "</h3>";

                for( var day = 1; day <= 31; day++) { // lol hacks
                    for (var friend_index=0; friend_index < bdays_in_month.length; friend_index++ ) {
                        var friend = bdays_in_month[friend_index];
                        if (friend.get_day() == day)
                            html += Render.table_row(friend);
                    }
                }

            }
        }
  
        $selector.html( html );

    },

    table_row: function( friend ) {
        
        var html = "<div class='row'>";
        html += "<div class='name'><a style='font-size:12px; line-height:14px;' href='"+ this.google_event_url(friend) +"' target='_blank'>[+] google</a> <img src='http://graph.facebook.com/" + friend.uid  + "/picture' />";
        html += friend.name + "</div>";

        if (friend.get_year())
            html += "<div class='year'>(" + friend.get_year() + ")</div>";
        else
            html += "<div class='year'>&nbsp;</div>";


        html += "<div class='bday'>" + friend.get_day();
        html += "</div></div>";
        return html;
    },

    google_event_url: function( friend ) {

        var d = new Date();
        var target_year = d.getFullYear(); // the current year

        var friend_month_index =  parseInt( MONTH_LIST.indexOf(friend.get_month()) );

        if ( friend_month_index < d.getMonth() ) {
            target_year++;
        } else if ( friend_month_index == d.getMonth()) {  // in same month, better check day
            if ( parseInt(friend.get_day()) < d.getDate() )
                target_year++;
        }

        var padded_day = friend.get_day();
        if (padded_day.length == 1) padded_day = "0" + padded_day;

        var padded_month = friend_month_index + 1;
        padded_month = "" + padded_month;
        if (padded_month.length == 1) padded_month = "0" + padded_month;


        var google_url = "http://www.google.com/calendar/event?action=TEMPLATE&text=" + friend.name + ": Birthday";

        google_url += "&dates=" + target_year + padded_month + padded_day + "T050000Z/" + target_year + padded_month + padded_day + "T050000Z";
        
        google_url += "&details=&location=&trp=false&sprop=http%3A%2F%2Fbirthdayblob.com&sprop=name:Birthday%20Blob";

        return google_url;
    },

    bar_chart_url: function() {
        var gchart_url = "https://chart.googleapis.com/chart?cht=bvs&chd=t:";

        //1,2,3,4,1,2,3,4,1,2,3,4
        var max_bdays = 0;
        var data_string = "";
        for( var i=0; i < MONTH_LIST.length; i++ ) {
            var num_bdays = Blob.get_birthdays_in_month( MONTH_LIST[i] ).length;
            max_bdays = Math.max( max_bdays, num_bdays );
            data_string += num_bdays;
            if (i != MONTH_LIST.length-1) data_string += ",";
        }
        
        gchart_url += data_string + "&chs=350x200&chxt=x,y&chxl=0:|Jan|||Apr||||Aug||||Dec|1:|0|" + max_bdays;

        gchart_url += "&chco=3B5998&chds=0," + max_bdays;
    
        return gchart_url;
    },

    most_common_year: function() {

        var year_bucket = [];
        for ( var i=0; i<Blob.friends.length; i++) {
            var friend = Blob.friends[i];
            var year = parseInt(friend.get_year());
            if ( year ) {
                if (year_bucket[year] === undefined)
                    year_bucket[year] = 0;

                year_bucket[ year ]++;
            }
        }

        var most_common_year = null;
        for ( var year in year_bucket ) {
            var count = year_bucket[ year ];
            
            if (most_common_year == null)
                most_common_year = year;

            if (count > year_bucket[most_common_year]) {
                most_common_year = year;
            }        
        }

        return most_common_year;
    }
}

